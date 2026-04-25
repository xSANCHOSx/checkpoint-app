jimport { extractDigits, normalizePlate } from '@/lib/plateUtils'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(200, parseInt(searchParams.get('limit') || '50'))
  const filter = searchParams.get('filter')
  const search = searchParams.get('search') || ''

  const where: Record<string, unknown> = {}

  if (filter === 'expired') where.isExpired = true
  if (filter === 'permanent') where.accessType = 'PERMANENT'
  if (filter === 'temporary') where.accessType = 'TEMPORARY'
  if (search) {
    where.OR = [
      { plate: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.vehicle.count({ where }),
  ])

  return NextResponse.json({ vehicles, total, page, limit })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const plate = normalizePlate(body.plate || '')
  if (!plate) {
    return NextResponse.json({ error: "Номер обов'язковий" }, { status: 400 })
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        plate,
        digits: extractDigits(plate),
        company: body.company || '',
        projectId: body.projectId ? Number(body.projectId) : null,
        contactName: body.contactName || null,
        contactPhone: body.contactPhone || null,
        accessType: body.accessType || 'PERMANENT',
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        note: body.note || null,
        source: 'manual',
      },
    })
    return NextResponse.json(vehicle, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Такий номер вже існує' }, { status: 409 })
    }
    throw error
  }
}