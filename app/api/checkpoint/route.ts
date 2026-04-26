import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizePlate } from '@/lib/plateUtils'

const VALID_RESULTS = new Set(['ALLOWED', 'DENIED', 'UNKNOWN'])

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const plate = typeof body.plate === 'string' ? normalizePlate(body.plate) : ''
  if (!plate || plate.length < 4) {
    return NextResponse.json({ error: 'Некоректний номер авто' }, { status: 400 })
  }

  const result = VALID_RESULTS.has(body.result as string)
    ? (body.result as 'ALLOWED' | 'DENIED' | 'UNKNOWN')
    : 'UNKNOWN'

  const vehicleId = typeof body.vehicleId === 'number' ? body.vehicleId : null

  // Запис логу
  const log = await prisma.accessLog.create({
    data: {
      plate,
      vehicleId,
      result,
      operatorId: typeof body.operatorId === 'string' ? body.operatorId : null,
      note: typeof body.note === 'string' ? body.note : null,
      syncedAt: new Date(),
      timestamp: typeof body.timestamp === 'string' ? new Date(body.timestamp) : new Date(),
    },
  })

  // SINGLE_USE: якщо пропустили → одразу блокуємо
  if (result === 'ALLOWED' && vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { accessType: true },
    })
    if ((vehicle?.accessType as string) === 'SINGLE_USE') {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { isExpired: true },
      })
    }
  }

  return NextResponse.json({ id: log.id }, { status: 201 })
}