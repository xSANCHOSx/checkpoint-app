import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { vehicles: true } },
    },
  })
  return NextResponse.json(projects)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: "Назва обов'язкова" }, { status: 400 })

  const project = await prisma.project.create({
    data: {
      name,
      note: body.note || null,
      active: body.active ?? true,
    },
  })
  return NextResponse.json(project, { status: 201 })
}
