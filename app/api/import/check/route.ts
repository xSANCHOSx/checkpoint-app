import { normalizePlate } from '@/lib/plateUtils'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/import/check
// Тіло: { plates: string[] }
// Відповідь: { existing: string[] } — нормалізовані номери, що вже є в БД
export async function POST(request: NextRequest) {
  const body = await request.json()
  const raw: unknown[] = Array.isArray(body.plates) ? body.plates : []

  if (raw.length === 0) {
    return NextResponse.json({ existing: [] })
  }

  const plates = raw.map(p => normalizePlate(String(p)))

  const found = await prisma.vehicle.findMany({
    where: { plate: { in: plates } },
    select: { plate: true },
  })

  return NextResponse.json({ existing: found.map(v => v.plate) })
}