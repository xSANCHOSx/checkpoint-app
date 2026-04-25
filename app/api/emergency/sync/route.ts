import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Публічний — для синхронізації PWA
export async function GET() {
  const vehicles = await prisma.emergencyVehicle.findMany({
    select: { id: true, plate: true, digits: true, note: true, addedBy: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(vehicles)
}
