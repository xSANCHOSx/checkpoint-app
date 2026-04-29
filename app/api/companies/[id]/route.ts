import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// PATCH — оновити (назва, active, note)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') data.name = body.name.trim()
  if (typeof body.active === 'boolean') data.active = body.active
  if ('note' in body) data.note = body.note || null

  const company = await prisma.company.update({ where: { id }, data })

  // Якщо компанію вимкнено — позначаємо авто як прострочені та дописуємо суфікс до примітки
  if (body.active === false) {
    await prisma.$executeRaw`
      UPDATE "Vehicle"
      SET
        "isExpired" = true,
        note = CASE
          WHEN note IS NULL OR note = ''
            THEN 'Компанія закінчена'
          WHEN note NOT LIKE '% | Компанія закінчена'
            THEN note || ' | Компанія закінчена'
          ELSE note
        END
      WHERE "companyId" = ${id}
    `
  }

  // Якщо компанію увімкнено — знімаємо прострочення та видаляємо лише суфікс
  if (body.active === true) {
    await prisma.$executeRaw`
      UPDATE "Vehicle"
      SET
        "isExpired" = false,
        note = CASE
          WHEN note = 'Компанія закінчена'
            THEN NULL
          WHEN note LIKE '% | Компанія закінчена'
            THEN LEFT(note, LENGTH(note) - LENGTH(' | Компанія закінчена'))
          ELSE note
        END
      WHERE "companyId" = ${id}
        AND (note = 'Компанія закінчена' OR note LIKE '% | Компанія закінчена')
    `
  }

  return NextResponse.json(company)
}

// DELETE — видалити компанію
// ?deleteVehicles=true → видалити всі авто компанії
// ?deleteVehicles=false → від'єднати (companyId = null)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const deleteVehicles = request.nextUrl.searchParams.get('deleteVehicles') === 'true'

  if (deleteVehicles) {
    const deleted = await prisma.vehicle.deleteMany({ where: { companyId: id } })
    await prisma.company.delete({ where: { id } })
    return NextResponse.json({ ok: true, vehiclesDeleted: deleted.count })
  } else {
    await prisma.vehicle.updateMany({ where: { companyId: id }, data: { companyId: null } })
    await prisma.company.delete({ where: { id } })
    return NextResponse.json({ ok: true, vehiclesDeleted: 0 })
  }
}
