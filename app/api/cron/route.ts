import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const CRON_SECRET = process.env.CRON_SECRET

    // If missing, fail gracefully (prevents build crash)
    if (!CRON_SECRET) {
      console.error('CRON_SECRET is not defined')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization') || ''
    const manualSecret = request.headers.get('x-cron-secret') || ''
    const bearerSecret = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : ''

    const isVercelCron = bearerSecret === CRON_SECRET
    const isManualCall = manualSecret === CRON_SECRET

    if (!isVercelCron && !isManualCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const cutoff30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const marked = await prisma.vehicle.updateMany({
      where: {
        accessType: 'TEMPORARY',
        expiresAt: { lt: now },
        isExpired: false,
      },
      data: { isExpired: true },
    })

    const deleted = await prisma.vehicle.deleteMany({
      where: {
        isExpired: true,
        expiresAt: { lt: cutoff30Days },
      },
    })

    return NextResponse.json({
      markedExpired: marked.count,
      deleted: deleted.count,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('CRON ERROR:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}