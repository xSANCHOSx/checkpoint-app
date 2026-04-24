import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizePlate, extractDigits } from '@/lib/plateUtils'

interface VehicleInput {
  plate: string
  company: string
  expiresAt: string | null
  accessType: 'PERMANENT' | 'TEMPORARY'
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const vehicles: VehicleInput[] = body.vehicles

  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return NextResponse.json({ error: 'Немає даних для збереження' }, { status: 400 })
  }

  const results = await Promise.all(
    vehicles.map(v => {
      const plate = normalizePlate(v.plate)
      const digits = extractDigits(plate)
      const expiresAt = v.expiresAt ? new Date(v.expiresAt) : null

      return prisma.vehicle.upsert({
        where: { plate },
        update: {
          digits,
          company: v.company,
          accessType: v.accessType,
          expiresAt,
          isExpired: false,
          source: 'excel',
        },
        create: {
          plate,
          digits,
          company: v.company,
          accessType: v.accessType,
          expiresAt,
          source: 'excel',
        },
      })
    })
  )

  const now = Date.now()
  let imported = 0, updated = 0
  for (const v of results) {
    const diff = Math.abs(v.updatedAt.getTime() - v.createdAt.getTime())
    if (diff < 2000) imported++
    else updated++
  }

  return NextResponse.json({ imported, updated, total: results.length })
}
