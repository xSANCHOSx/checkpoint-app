/**
 * DB-based rate limiter (PostgreSQL via Prisma).
 * Працює коректно у serverless (Vercel) та Docker — спільний стан у БД.
 * Замінює попередню in-memory реалізацію (Map), яка не працювала між
 * ізольованими serverless-інстанціями.
 */
import { prisma } from './prisma'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * @param key      Унікальний ідентифікатор (IP + маршрут)
 * @param limit    Максимум запитів у вікні
 * @param windowMs Тривалість вікна в мілісекундах
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.rateLimit.findUnique({ where: { key } })

    // Вікно не існує або вже скинулось → починаємо нове
    if (!existing || existing.resetAt < now) {
      const resetAt = new Date(now.getTime() + windowMs)
      await tx.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      })
      return { count: 1, resetAt }
    }

    // Інкремент у поточному вікні
    const updated = await tx.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
      select: { count: true },
    })

    return { count: updated.count, resetAt: existing.resetAt }
  })

  const allowed = result.count <= limit
  return {
    allowed,
    remaining: Math.max(0, limit - result.count),
    resetAt: result.resetAt.getTime(),
  }
}

/** Очищення застарілих записів — викликати з cron або /api/cron */
export async function cleanupRateLimits(): Promise<void> {
  await prisma.rateLimit.deleteMany({
    where: { resetAt: { lt: new Date() } },
  })
}

/** Витягти реальний IP з Next.js request headers */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
