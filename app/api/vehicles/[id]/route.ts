import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

const { prisma } = await import('@/lib/prisma')
const { normalizePlate, extractDigits } = await import('@/lib/plateUtils')

  const body = await request.json()
  const plate = body.plate ? normalizePlate(body.plate) : undefined

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(plate && { plate, digits: extractDigits(plate) }),
        company: body.company,
        contactName: body.contactName || null,
        contactPhone: body.contactPhone || null,
        accessType: body.accessType,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isExpired: body.isExpired ?? false,
        note: body.note || null,
      },
    })
    return NextResponse.json(vehicle)
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Не знайдено' }, { status: 404 })
    }
    throw error
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  const { prisma } = await import('@/lib/prisma')
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    await prisma.vehicle.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Не знайдено' }, { status: 404 })
    }
    throw error
  }
}
