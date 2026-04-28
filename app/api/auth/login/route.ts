import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken, tokenCookieOptions } from '@/lib/jwt'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { loginSchema, formatZodError } from '@/lib/zodSchemas'

// Хеш для порівняння коли користувач не знайдений (захист від timing attack).
// Можна змінити через env DUMMY_HASH (заздалегідь згенерований bcrypt-хеш).
const DUMMY_HASH =
  process.env.DUMMY_HASH ??
  '$2b$12$dummyhashforcomparisonpurposesonly123456789012345678'

export async function POST(request: NextRequest) {
  // Rate limit: 10 спроб за 15 хвилин з одного IP (DB-based → працює у serverless)
  const ip = getClientIp(request)
  const rl = await rateLimit(`login:${ip}`, 10, 15 * 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Забагато спроб. Спробуйте через 15 хвилин.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    )
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Zod-валідація вхідних даних
  const parsed = loginSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    )
  }

  const { username, password } = parsed.data

  // Завжди виконуємо порівняння хешу (захист від timing attack via user enumeration)
  const user = await prisma.user.findUnique({ where: { username } })
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH

  const isValid = await bcrypt.compare(password, hashToCompare)

  if (!user || !isValid) {
    return NextResponse.json({ error: 'Невірний логін або пароль' }, { status: 401 })
  }

  // Оновлюємо lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  const token = await signToken({
    sub: String(user.id),
    username: user.username,
    role: user.role,
  })

  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, username: user.username, role: user.role },
  })

  response.cookies.set(tokenCookieOptions(token))
  return response
}
