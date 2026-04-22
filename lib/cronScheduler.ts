import cron from 'node-cron'

let cronStarted = false

export function startCron() {
  if (cronStarted) return
  cronStarted = true

  console.log('[cron] Scheduler started')

  // Щодня о 00:00 — позначити прострочені та видалити старі
  cron.schedule('0 0 * * *', async () => {
    console.log('[cron] Running expiry check...')
    try {
      const url = process.env.APP_URL || 'http://localhost:3000'
      const res = await fetch(`${url}/api/cron`, {
        headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
      })
      const data = await res.json()
      console.log('[cron] Done:', data)
    } catch (err) {
      console.error('[cron] Error:', err)
    }
  })
}
