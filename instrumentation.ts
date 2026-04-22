// Цей файл викликається Next.js один раз при старті сервера.
// Саме тут треба запускати cron — НЕ в layout.tsx.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCron } = await import('./lib/cronScheduler')
    startCron()
  }
}
