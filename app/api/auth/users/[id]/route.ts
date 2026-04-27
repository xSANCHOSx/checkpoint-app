import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// PATCH — змінити пароль або роль
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const requestingUserId = parseInt(request.headers.get('x-user-id') ?? '0')
  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (typeof body.password === 'string') {
    if (body.password.length < 8) {
      return NextResponse.json({ error: 'Пароль мінімум 8 символів' }, { status: 400 })
    }
    data.passwordHash = await bcrypt.hash(body.password, 12)
  }

  if (typeof body.role === 'string') {
    if (!['ADMIN', 'OPERATOR'].includes(body.role)) {
      return NextResponse.json({ error: 'Некоректна роль' }, { status: 400 })
    }
    // Не можна змінити власну роль
    if (id === requestingUserId) {
      return NextResponse.json({ error: 'Не можна змінити власну роль' }, { status: 403 })
    }
    data.role = body.role
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Нічого не змінено' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, role: true, updatedAt: true },
  })

  return NextResponse.json(user)
}

// DELETE — видалити користувача
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const requestingUserId = parseInt(request.headers.get('x-user-id') ?? '0')
  if (id === requestingUserId) {
    return NextResponse.json({ error: 'Не можна видалити власний акаунт' }, { status: 403 })
  }

  // Перевіряємо що залишається хоча б один ADMIN
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } })
  if (user?.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Не можна видалити останнього адміна' }, { status: 403 })
    }
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
