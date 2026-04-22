import { parseExcel } from '@/lib/excelParser'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Файл не завантажено' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { rows, errors } = parseExcel(buffer)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Не знайдено жодного рядка', errors },
        { status: 400 }
      )
    }

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
            isExpired: false,
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

    const now = Date.now()
    let imported = 0
    let updated = 0

    for (const v of results) {
      const diffMs = Math.abs(
        v.updatedAt.getTime() - v.createdAt.getTime()
      )
      if (diffMs < 2000) imported++
      else updated++
    }

    return NextResponse.json({
      imported,
      updated,
      errors,
      total: rows.length,
    })
  } catch (error) {
    console.error('IMPORT ERROR:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}