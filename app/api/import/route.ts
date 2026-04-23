import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseExcel } from '@/lib/excelParser'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Файл не завантажено' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { rows, errors } = parseExcel(buffer)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Не знайдено жодного рядка', errors }, { status: 400 })
  }

  // ✅ ВИПРАВЛЕНО: один upsert замість N×2 окремих запитів
  const results = await Promise.all(
    rows.map(row =>
      prisma.vehicle.upsert({
        where: { plate: row.plate },
        update: {
          digits: row.digits,
          company: row.company,
          contactName: row.contactName,
          contactPhone: row.contactPhone,
          accessType: row.accessType,
          expiresAt: row.expiresAt,
          note: row.note,
          source: 'excel',
          isExpired: false, // скидаємо при оновленні з Excel
        },
        create: {
          plate: row.plate,
          digits: row.digits,
          company: row.company,
          contactName: row.contactName,
          contactPhone: row.contactPhone,
          accessType: row.accessType,
          expiresAt: row.expiresAt,
          note: row.note,
          source: 'excel',
        },
      })
    )
  )

  // Рахуємо нові vs оновлені (порівнюємо createdAt ≈ updatedAt)
  const now = Date.now()
  let imported = 0
  let updated = 0
  for (const v of results) {
    const diffMs = Math.abs(v.updatedAt.getTime() - v.createdAt.getTime())
    if (diffMs < 2000) imported++
    else updated++
  }

  return NextResponse.json({ imported, updated, errors, total: rows.length })
}
