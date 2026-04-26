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

  // Якщо проект вимкнено — позначаємо всі його авто як прострочені
  if (body.active === false) {
    await prisma.vehicle.updateMany({
      where: { projectId: id },
      data: {
        isExpired: true,
        note: 'Проект закінчено',
      },
    })
  }

  // Якщо проект увімкнено — знімаємо прострочення з авто які мали примітку "Проект закінчено"
  if (body.active === true) {
    await prisma.vehicle.updateMany({
      where: {
        projectId: id,
        note: 'Проект закінчено',
      },
      data: {
        isExpired: false,
        note: null,
      },
    })
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