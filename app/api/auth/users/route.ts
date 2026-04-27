import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const MIN_PASSWORD_LENGTH = 8
const VALID_ROLES = new Set(['ADMIN', 'OPERATOR'])

// GET /api/auth/users — список користувачів
export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

// POST /api/auth/users — створити користувача
export async function POST(request: NextRequest) {
  const body = await request.json()

  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const role = typeof body.role === 'string' ? body.role : 'OPERATOR'

  if (!username || username.length < 3) {
    return NextResponse.json({ error: 'Логін мінімум 3 символи' }, { status: 400 })
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return NextResponse.json(
      { error: 'Логін може містити лише латинські літери, цифри, _, -, .' },
      { status: 400 }
    )
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Пароль мінімум ${MIN_PASSWORD_LENGTH} символів` },
      { status: 400 }
    )
  }
  if (!VALID_ROLES.has(role)) {
    return NextResponse.json({ error: 'Некоректна роль' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const user = await prisma.user.create({
      data: { username, passwordHash, role },
      select: { id: true, username: true, role: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Такий логін вже існує' }, { status: 409 })
    }
    throw e
  }
}
