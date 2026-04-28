import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizePlate } from '@/lib/plateUtils'
import { checkpointSchema, formatZodError } from '@/lib/zodSchemas'

export async function POST(request: NextRequest) {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Zod-валідація
  const parsed = checkpointSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    )
  }

  const { result, vehicleId, operatorId, note, timestamp } = parsed.data
  const plate = normalizePlate(parsed.data.plate)

  if (!plate || plate.length < 4) {
    return NextResponse.json({ error: 'Некоректний номер авто' }, { status: 400 })
  }

  // Запис логу
  const log = await prisma.accessLog.create({
    data: {
      plate,
      vehicleId: vehicleId ?? null,
      result,
      operatorId: operatorId ?? null,
      note: note ?? null,
      syncedAt: new Date(),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
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