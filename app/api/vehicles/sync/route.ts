import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_LIMIT = 500
const MAX_LIMIT = 1000

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const since = searchParams.get('since')
  const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)), MAX_LIMIT)
  const offset = parseInt(searchParams.get('offset') || '0')

  if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
    return NextResponse.json({ error: 'Invalid pagination params' }, { status: 400 })
  }

  let sinceDate: Date | undefined
  if (since) {
    sinceDate = new Date(since)
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json({ error: 'Invalid since date' }, { status: 400 })
    }
  }

  const where = sinceDate ? { updatedAt: { gt: sinceDate } } : {}

  const vehicles = await prisma.vehicle.findMany({
    where,
    select: {
      id: true,
      plate: true,
      digits: true,
      company: true,
      projectId: true,
      contactName: true,
      contactPhone: true,
      accessType: true,
      expiresAt: true,
      isExpired: true,
      note: true,
      updatedAt: true,
      project: { select: { name: true, active: true } },
    },
    orderBy: { updatedAt: 'asc' },
    take: limit,
    skip: offset,
  })

  const result = vehicles.map(v => ({
    id: v.id,
    plate: v.plate,
    digits: v.digits,
    company: v.company,
    projectId: v.projectId,
    projectName: v.project?.name ?? null,
    projectActive: v.project?.active ?? null,
    contactName: v.contactName,
    contactPhone: v.contactPhone,
    accessType: v.accessType,
    expiresAt: v.expiresAt?.toISOString() ?? null,
    isExpired: v.isExpired,
    note: v.note,
    updatedAt: v.updatedAt.toISOString(),
  }))

  return NextResponse.json(result)
}