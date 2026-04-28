import { extractDigits, normalizePlate } from '@/lib/plateUtils'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

interface VehicleInput {
  plate: string
  company: string
  project: string | null
  contactName: string | null
  contactPhone: string | null
  accessType: 'PERMANENT' | 'TEMPORARY' | 'SINGLE_USE'
  expiresAt: string | null
  note: string | null
}

// Отримати або створити проект за назвою
async function resolveProject(name: string | null): Promise<number | null> {
  if (!name || !name.trim()) return null
  const existing = await prisma.project.findFirst({ where: { name: { equals: name.trim(), mode: 'insensitive' } } })
  if (existing) return existing.id
  const created = await prisma.project.create({ data: { name: name.trim() } })
  return created.id
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const vehicles: VehicleInput[] = body.vehicles

  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return NextResponse.json({ error: 'Немає даних для збереження' }, { status: 400 })
  }

  // Заздалегідь резолвимо унікальні проекти (зменшуємо кількість запитів)
  const uniqueProjects = Array.from(new Set(vehicles.map(v => v.project).filter(Boolean) as string[]))
  const projectMap = new Map<string, number>()
  for (const name of uniqueProjects) {
    const id = await resolveProject(name)
    if (id) projectMap.set(name.trim().toLowerCase(), id)
  }

  const results = await Promise.all(
    vehicles.map(v => {
      const plate      = normalizePlate(v.plate)
      const digits     = extractDigits(plate)
      const expiresAt  = v.expiresAt ? new Date(v.expiresAt) : null
      const projectId  = v.project ? (projectMap.get(v.project.trim().toLowerCase()) ?? null) : null

      return prisma.vehicle.upsert({
        where: { plate },
        update: {
          digits,
          company:      v.company,
          projectId,
          contactName:  v.contactName  ?? null,
          contactPhone: v.contactPhone ?? null,
          accessType:   v.accessType,
          expiresAt,
          note:         v.note ?? null,
          isExpired:    false,
          source:       'excel',
        },
        create: {
          plate,
          digits,
          company:      v.company,
          projectId,
          contactName:  v.contactName  ?? null,
          contactPhone: v.contactPhone ?? null,
          accessType:   v.accessType,
          expiresAt,
          note:         v.note ?? null,
          source:       'excel',
        },
      })
    })
  )

  let imported = 0, updated = 0
  for (const v of results) {
    const diff = Math.abs(v.updatedAt.getTime() - v.createdAt.getTime())
    if (diff < 2000) imported++
    else updated++
  }

  return NextResponse.json({ imported, updated, total: results.length })
}