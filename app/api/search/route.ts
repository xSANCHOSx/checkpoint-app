import { getDaysLeft, getDaysOverdue, getVehicleStatus } from '@/lib/plateUtils'
import { prisma } from '@/lib/prisma'
import { Vehicle } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || ''

  if (q.length < 2) {
    return NextResponse.json([])
  }

  const isDigitsOnly = /^\d+$/.test(q)

  // Шукаємо паралельно у звичайних та екстрених авто
  const [vehicles, emergencyVehicles] = await Promise.all([
    prisma.vehicle.findMany({
      where: isDigitsOnly
        ? { digits: { contains: q } }
        : { plate: { contains: q.toUpperCase() } },
      orderBy: { company: 'asc' },
      take: 10,
    }),
    prisma.emergencyVehicle.findMany({
      where: isDigitsOnly
        ? { digits: { contains: q } }
        : { plate: { contains: q.toUpperCase() } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const regularResults = vehicles.map((v: Vehicle) => ({
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
    isEmergency: false,
  }))

  const emergencyResults = emergencyVehicles.map(e => ({
    id: e.id,
    plate: e.plate,
    company: e.addedBy ? `Екстрений (${e.addedBy})` : 'Екстрений список',
    contactName: null,
    contactPhone: null,
    accessType: 'PERMANENT' as const,
    expiresAt: null,
    isExpired: false,
    status: 'ALLOWED' as const,
    daysLeft: null,
    daysOverdue: null,
    note: e.note,
    isEmergency: true,
  }))

  // Екстрені йдуть першими
  return NextResponse.json([...emergencyResults, ...regularResults])
}