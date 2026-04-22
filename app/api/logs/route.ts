import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { prisma } = await import('@/lib/prisma')
  const log = await prisma.accessLog.create({
    data: {
      plate: body.plate,
      vehicleId: body.vehicleId || null,
      result: body.result || 'UNKNOWN',
      operatorId: body.operatorId || null,
      note: body.note || null,
      syncedAt: new Date(),
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
    },
  })

  return NextResponse.json(log, { status: 201 })
}

export async function GET(request: NextRequest) {
  const { prisma } = await import('@/lib/prisma')
  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(200, parseInt(searchParams.get('limit') || '50'))
  const date = searchParams.get('date') // YYYY-MM-DD
  const plate = searchParams.get('plate') || ''

  const where: Record<string, unknown> = {}

  if (date) {
    const start = new Date(date)
    const end = new Date(date)
    end.setDate(end.getDate() + 1)
    where.timestamp = { gte: start, lt: end }
  }
  if (plate) {
    where.plate = { contains: plate, mode: 'insensitive' }
  }

  const [logs, total] = await Promise.all([
    prisma.accessLog.findMany({
      where,
      include: {
        vehicle: { select: { company: true, accessType: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { timestamp: 'desc' },
    }),
    prisma.accessLog.count({ where }),
  ])

  return NextResponse.json({ logs, total, page, limit })
}
