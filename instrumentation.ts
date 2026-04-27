// Цей файл викликається Next.js один раз при старті сервера.
//
// Логіка cron:
// - Vercel: VERCEL=1 встановлено автоматично → використовуємо vercel.json crons
//           node-cron НЕ запускаємо (не потрібен, serverless не тримає процес)
// - Docker: VERCEL не встановлено → запускаємо node-cron для щоденного завдання

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const isVercel = !!process.env.VERCEL

  if (isVercel) {
    console.log('[cron] Running on Vercel — using vercel.json schedule, skipping node-cron')
    return
  }

  // Docker / локальна імплементація
  console.log('[cron] Running on Docker/local — starting node-cron scheduler')
  const { startCron } = await import('./lib/cronScheduler')
  startCron()
}
