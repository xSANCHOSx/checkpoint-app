import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/vehicles/batch
// Підтримує: expiresAt, accessType, projectId, isExpired, delete
export async function PATCH(request: NextRequest) {
  const body = await request.json()

  const ids: number[] = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown) => typeof id === 'number')
    : []

  if (ids.length === 0) return NextResponse.json({ error: 'Немає ID' }, { status: 400 })
  if (ids.length > 1000) return NextResponse.json({ error: 'Забагато записів' }, { status: 400 })

  // Видалення
  if (body.delete === true) {
    const result = await prisma.vehicle.deleteMany({ where: { id: { in: ids } } })
    return NextResponse.json({ deleted: result.count })
  }

  const data: Record<string, unknown> = {}

  // Термін дії
  if ('expiresAt' in body) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (body.expiresAt && isNaN((expiresAt as Date).getTime())) {
      return NextResponse.json({ error: 'Некоректна дата' }, { status: 400 })
    }
    data.expiresAt = expiresAt
    data.isExpired = false
  }

  // Тип доступу
  if ('accessType' in body) {
    const validTypes = ['PERMANENT', 'TEMPORARY', 'SINGLE_USE']
    if (!validTypes.includes(body.accessType)) {
      return NextResponse.json({ error: 'Некоректний тип' }, { status: 400 })
    }
    data.accessType = body.accessType
    if (body.accessType === 'PERMANENT') {
      data.expiresAt = null
      data.isExpired = false
    }
  }

  // Проект
  if ('projectId' in body) {
    data.projectId = body.projectId ? Number(body.projectId) : null
  }

  // Блокування / розблокування
  if ('isExpired' in body && typeof body.isExpired === 'boolean') {
    data.isExpired = body.isExpired
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Нічого оновлювати' }, { status: 400 })
  }

  const result = await prisma.vehicle.updateMany({
    where: { id: { in: ids } },
    data,
  })

  return NextResponse.json({ updated: result.count })
}