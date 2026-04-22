import { NextRequest, NextResponse } from 'next/server'


export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const logs: unknown[] = await request.json()

  if (!Array.isArray(logs) || logs.length === 0) {
    return NextResponse.json({ saved: 0 })
  }
   const { prisma } = await import('@/lib/prisma')

  type LogEntry = {
    plate: string
    vehicleId?: number | null
    result?: string
    operatorId?: string | null
    note?: string | null
    timestamp?: string
  }

  const saved = await prisma.accessLog.createMany({
    data: (logs as LogEntry[]).map(log => ({
      plate: log.plate,
      vehicleId: log.vehicleId || null,
      result: (log.result as 'ALLOWED' | 'DENIED' | 'UNKNOWN') || 'UNKNOWN',
      operatorId: log.operatorId || null,
      note: log.note || null,
      syncedAt: new Date(),
      timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    })),
    skipDuplicates: true,
  })

  return NextResponse.json({ saved: saved.count })
}
