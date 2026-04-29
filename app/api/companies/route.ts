import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { vehicles: true } },
    },
  })
  return NextResponse.json(companies)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: "Назва обов'язкова" }, { status: 400 })

  try {
    const company = await prisma.company.create({
      data: {
        name,
        note: body.note || null,
        active: body.active ?? true,
      },
    })
    return NextResponse.json(company, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Компанія з такою назвою вже існує' }, { status: 409 })
    }
    throw error
  }
}
