import { getDaysLeft, getDaysOverdue, getVehicleStatus } from '@/lib/plateUtils'
import { prisma } from '@/lib/prisma'
import { Vehicle } from '@prisma/client'   
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || ''

  if (q.length < 2) {
    return NextResponse.json([])
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { digits: { contains: q } },
    orderBy: { company: 'asc' },
    take: 10,
  })

  const result = vehicles.map((v: Vehicle) => ({
    id: v.id,
    plate: v.plate,
    company: v.company,
    contactName: v.contactName,
    contactPhone: v.contactPhone,
    accessType: v.accessType,
    expiresAt: v.expiresAt?.toISOString() ?? null,
    isExpired: v.isExpired,
    status: getVehicleStatus(v),
    daysLeft: getDaysLeft(v.expiresAt),
    daysOverdue: getDaysOverdue(v.expiresAt),
    note: v.note,
  }))

  return NextResponse.json(result)
}
