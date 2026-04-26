import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const MAX_LOGS_PER_REQUEST = 500
const MAX_BODY_BYTES = 1 * 1024 * 1024 // 1 MB

const VALID_RESULTS = new Set(['ALLOWED', 'DENIED', 'UNKNOWN'])

interface LogEntry {
  plate: string
  vehicleId?: number | null
  result?: string
  operatorId?: string | null
  note?: string | null
  timestamp?: string
}

function validateLog(log: unknown): log is LogEntry {
  if (!log || typeof log !== 'object') return false
  const l = log as Record<string, unknown>

  if (typeof l.plate !== 'string' || l.plate.trim().length === 0) return false
  if (l.plate.length > 20) return false

  if (l.result !== undefined && !VALID_RESULTS.has(l.result as string)) return false
  if (l.vehicleId !== undefined && l.vehicleId !== null && typeof l.vehicleId !== 'number') return false
  if (l.operatorId !== undefined && l.operatorId !== null && typeof l.operatorId !== 'string') return false
  if (l.note !== undefined && l.note !== null && typeof l.note !== 'string') return false
  if (l.timestamp !== undefined && isNaN(Date.parse(l.timestamp as string))) return false

  return true
}

export async function POST(request: NextRequest) {
  // Перевірка розміру запиту
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ saved: 0 })
  }

  if (body.length > MAX_LOGS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Too many logs. Max ${MAX_LOGS_PER_REQUEST} per request.` },
      { status: 400 }
    )
  }

  // Валідація кожного запису
  const validLogs = body.filter(validateLog)
  if (validLogs.length === 0) {
    return NextResponse.json({ saved: 0 })
  }

  const saved = await prisma.accessLog.createMany({
    data: validLogs.map(log => ({
      plate: log.plate.trim(),
      vehicleId: typeof log.vehicleId === 'number' ? log.vehicleId : null,
      result: (VALID_RESULTS.has(log.result ?? '') ? log.result : 'UNKNOWN') as 'ALLOWED' | 'DENIED' | 'UNKNOWN',
      operatorId: log.operatorId || null,
      note: log.note || null,
      syncedAt: new Date(),
      timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    })),
    skipDuplicates: true,
  })

  // SINGLE_USE: expire vehicles that were ALLOWED offline
  const allowedIds = validLogs
    .filter(l => l.result === 'ALLOWED' && typeof l.vehicleId === 'number')
    .map(l => l.vehicleId as number)

  if (allowedIds.length > 0) {
    await prisma.vehicle.updateMany({
      where: { id: { in: allowedIds }, accessType: 'SINGLE_USE' },
      data: { isExpired: true },
    })
  }

  return NextResponse.json({ saved: saved.count })
}