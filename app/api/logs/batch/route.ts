import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { batchLogsSchema, formatZodError, type LogEntry } from '@/lib/zodSchemas'

const MAX_BODY_BYTES = 1 * 1024 * 1024 // 1 MB

export async function POST(request: NextRequest) {
  // Перевірка розміру запиту
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(rawBody) || rawBody.length === 0) {
    return NextResponse.json({ saved: 0 })
  }

  // Zod-валідація масиву логів
  const parsed = batchLogsSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    )
  }

  const validLogs = parsed.data
  if (validLogs.length === 0) {
    return NextResponse.json({ saved: 0 })
  }

  // ─── Вирішення конфліктів SINGLE_USE ──────────────────────────────────────
  // Якщо кілька операторів офлайн пропустили одне авто SINGLE_USE,
  // при синхронізації прийде кілька ALLOWED-логів для одного vehicleId.
  // Залишаємо лише перший за timestamp (найраніший), решту змінюємо на DENIED.
  const allowedByVehicle = new Map<number, LogEntry>()
  const resolvedLogs: LogEntry[] = []

  for (const log of validLogs) {
    if (log.result === 'ALLOWED' && typeof log.vehicleId === 'number') {
      const existing = allowedByVehicle.get(log.vehicleId)
      if (!existing) {
        allowedByVehicle.set(log.vehicleId, log)
        resolvedLogs.push(log)
      } else {
        // Пізніший дубль — визначаємо переможця за timestamp
        const existingTs = existing.timestamp ? new Date(existing.timestamp).getTime() : 0
        const currentTs = log.timestamp ? new Date(log.timestamp).getTime() : 0
        if (currentTs < existingTs) {
          // Поточний раніший → він переможець, попередній стає DENIED
          allowedByVehicle.set(log.vehicleId, log)
          const prevIdx = resolvedLogs.findIndex(l => l === existing)
          if (prevIdx !== -1) resolvedLogs[prevIdx] = { ...existing, result: 'DENIED', note: (existing.note ?? '') + ' [конфлікт: дубль SINGLE_USE]' }
          resolvedLogs.push(log)
        } else {
          // Поточний пізніший → він стає DENIED
          resolvedLogs.push({ ...log, result: 'DENIED', note: (log.note ?? '') + ' [конфлікт: дубль SINGLE_USE]' })
        }
      }
    } else {
      resolvedLogs.push(log)
    }
  }

  // Перевірка: якщо vehicleId вже isExpired у БД до батчу — відхиляємо ALLOWED
  const vehicleIdsToCheck = [...allowedByVehicle.keys()]
  const alreadyExpired = vehicleIdsToCheck.length > 0
    ? await prisma.vehicle.findMany({
        where: { id: { in: vehicleIdsToCheck }, isExpired: true },
        select: { id: true },
      })
    : []
  const expiredSet = new Set(alreadyExpired.map(v => v.id))

  const finalLogs = resolvedLogs.map(log => {
    if (log.result === 'ALLOWED' && typeof log.vehicleId === 'number' && expiredSet.has(log.vehicleId)) {
      return { ...log, result: 'DENIED' as const, note: (log.note ?? '') + ' [вже заблоковано]' }
    }
    return log
  })

  // ─── Запис у БД ────────────────────────────────────────────────────────────
  const saved = await prisma.accessLog.createMany({
    data: finalLogs.map(log => ({
      plate: log.plate.trim(),
      vehicleId: typeof log.vehicleId === 'number' ? log.vehicleId : null,
      result: log.result as 'ALLOWED' | 'DENIED' | 'UNKNOWN',
      operatorId: log.operatorId || null,
      note: log.note || null,
      syncedAt: new Date(),
      timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    })),
    skipDuplicates: true,
  })

  // SINGLE_USE: expire тільки переможців, яких не було заблоковано заздалегідь
  const allowedIdsToExpire = [...allowedByVehicle.keys()].filter(id => !expiredSet.has(id))

  if (allowedIdsToExpire.length > 0) {
    await prisma.vehicle.updateMany({
      where: { id: { in: allowedIdsToExpire }, accessType: 'SINGLE_USE' },
      data: { isExpired: true },
    })
  }

  return NextResponse.json({ saved: saved.count })
}