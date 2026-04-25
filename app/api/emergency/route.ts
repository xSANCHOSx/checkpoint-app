import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizePlate, extractDigits } from '@/lib/plateUtils'

// GET — список (захищено в middleware через /api/emergency)
export async function GET() {
  const vehicles = await prisma.emergencyVehicle.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(vehicles)
}

// POST — додати авто
export async function POST(request: NextRequest) {
  const body = await request.json()
  const plate = typeof body.plate === 'string' ? normalizePlate(body.plate) : ''
  if (!plate || plate.length < 4) {
    return NextResponse.json({ error: 'Некоректний номер' }, { status: 400 })
  }

  const vehicle = await prisma.emergencyVehicle.upsert({
    where: { plate },
    update: {
      note: body.note || null,
      addedBy: body.addedBy || null,
    },
    create: {
      plate,
      digits: extractDigits(plate),
      note: body.note || null,
      addedBy: body.addedBy || null,
    },
  })

  return NextResponse.json(vehicle, { status: 201 })
}
