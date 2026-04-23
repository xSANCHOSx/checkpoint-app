import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/vehicles/sync?since=2024-01-01T00:00:00Z
// Повертає всі авто змінені після вказаної дати (для delta-sync)
export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get('since')

  const where = since ? { updatedAt: { gt: new Date(since) } } : {}

  const vehicles = await prisma.vehicle.findMany({
    where,
    select: {
      id: true,
      plate: true,
      digits: true,
      company: true,
      contactName: true,
      contactPhone: true,
      accessType: true,
      expiresAt: true,
      isExpired: true,
      note: true,
      updatedAt: true, // потрібно для наступного delta-sync
    },
  })

  return NextResponse.json(vehicles)
}
