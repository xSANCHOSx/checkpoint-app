import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

function checkAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') || ''
  const [scheme, b64] = authHeader.split(' ')
  if (scheme !== 'Basic' || !b64) return false
  const decoded = Buffer.from(b64, 'base64').toString('utf-8')
  const colonIdx = decoded.indexOf(':')
  if (colonIdx === -1) return false
  const user = decoded.slice(0, colonIdx)
  const pass = decoded.slice(colonIdx + 1)
  const expectedUser = process.env.ADMIN_USER ?? ''
  const expectedPass = process.env.ADMIN_PASS ?? ''
  const userMatch = user.length === expectedUser.length && Buffer.from(user).equals(Buffer.from(expectedUser))
  const passMatch = pass.length === expectedPass.length && Buffer.from(pass).equals(Buffer.from(expectedPass))
  return userMatch && passMatch
}

export async function POST(request: NextRequest) {
  const body = await request.json()

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