import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Vercel Cron автоматично додає Authorization: Bearer <CRON_SECRET>
  // Ручний виклик через заголовок x-cron-secret
  const authHeader = request.headers.get('authorization') || ''
  const manualSecret = request.headers.get('x-cron-secret') || ''
  const bearerSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  const isVercelCron = bearerSecret === process.env.CRON_SECRET
  const isManualCall = manualSecret === process.env.CRON_SECRET

  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const cutoff30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // 1. Позначити прострочені тимчасові пропуски
  const marked = await prisma.vehicle.updateMany({
    where: {
      accessType: 'TEMPORARY',
      expiresAt: { lt: now },
      isExpired: false,
    },
    data: { isExpired: true },
  })

  // 2. Видалити ті що прострочені більше 30 днів
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
}
