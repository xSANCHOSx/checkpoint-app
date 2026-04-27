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

  const project = await prisma.project.update({ where: { id }, data })

  // Якщо проект вимкнено — позначаємо авто як прострочені та ДОПИСУЄМО суфікс до примітки
  if (body.active === false) {
    await prisma.$executeRaw`
      UPDATE "Vehicle"
      SET
        "isExpired" = true,
        note = CASE
          WHEN note IS NULL OR note = ''
            THEN 'Проект закінчено'
          WHEN note NOT LIKE '% | Проект закінчено'
            THEN note || ' | Проект закінчено'
          ELSE note
        END
      WHERE "projectId" = ${id}
    `
  }

  // Якщо проект увімкнено — знімаємо прострочення та ВИДАЛЯЄМО лише суфікс
  if (body.active === true) {
    await prisma.$executeRaw`
      UPDATE "Vehicle"
      SET
        "isExpired" = false,
        note = CASE
          WHEN note = 'Проект закінчено'
            THEN NULL
          WHEN note LIKE '% | Проект закінчено'
            THEN LEFT(note, LENGTH(note) - LENGTH(' | Проект закінчено'))
          ELSE note
        END
      WHERE "projectId" = ${id}
        AND (note = 'Проект закінчено' OR note LIKE '% | Проект закінчено')
    `
  }

  return NextResponse.json(project)
}

// DELETE — видалити проект
// ?deleteVehicles=true → видалити всі авто проекту
// ?deleteVehicles=false → від'єднати (projectId = null)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const deleteVehicles = request.nextUrl.searchParams.get('deleteVehicles') === 'true'

  if (deleteVehicles) {
    // Видаляємо авто проекту, потім сам проект
    const deleted = await prisma.vehicle.deleteMany({ where: { projectId: id } })
    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ ok: true, vehiclesDeleted: deleted.count })
  } else {
    // Від'єднуємо авто (зберігаємо їх), видаляємо проект
    await prisma.vehicle.updateMany({ where: { projectId: id }, data: { projectId: null } })
    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ ok: true, vehiclesDeleted: 0 })
  }
}