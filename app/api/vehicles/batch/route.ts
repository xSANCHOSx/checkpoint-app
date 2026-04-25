import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/vehicles/batch
// Body: { ids: number[], expiresAt: string }
export async function PATCH(request: NextRequest) {
  const body = await request.json()

  const ids: number[] = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === 'number') : []
  if (ids.length === 0) return NextResponse.json({ error: 'Немає ID' }, { status: 400 })
  if (ids.length > 1000) return NextResponse.json({ error: 'Забагато записів' }, { status: 400 })

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
  if (body.expiresAt && isNaN((expiresAt as Date).getTime())) {
    return NextResponse.json({ error: 'Некоректна дата' }, { status: 400 })
  }

  const result = await prisma.vehicle.updateMany({
    where: { id: { in: ids } },
    data: {
      expiresAt,
      accessType: expiresAt ? 'TEMPORARY' : 'PERMANENT',
      isExpired: false,
    },
  })

  return NextResponse.json({ updated: result.count })
}
