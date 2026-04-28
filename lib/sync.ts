import { localDb, getPendingLogs, markLogsSynced } from './localDb'

const LAST_SYNC_KEY = 'checkpoint_last_sync'
const MAX_RETRIES = 3
const RETRY_BASE_MS = 1000

// Retry helper з exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}

// Головна функція синхронізації — викликається при появі інтернету
export async function syncAll(): Promise<{ pulled: number; pushed: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { pulled: 0, pushed: 0 }
  }

  const [pushed, pulled] = await Promise.all([
    pushPendingLogs(),
    pullVehicles(),
    pullEmergencyVehicles(),
  ])

  return { pulled, pushed }
}

// Відправляємо офлайн-логи на сервер (з retry + пагінацією по 100 записів)
async function pushPendingLogs(): Promise<number> {
  const pending = await getPendingLogs()
  if (pending.length === 0) return 0

  const BATCH_SIZE = 100
  let totalPushed = 0

  // Відправляємо порціями по 100, щоб не перевантажувати мережу одним великим запитом
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)

    try {
      await withRetry(async () => {
        const res = await fetch('/api/logs/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        })
        if (!res.ok) throw new Error(`Push failed: ${res.status}`)

        const ids = batch.map(l => l.id!).filter(Boolean)
        await markLogsSynced(ids)
      })

      totalPushed += batch.length
    } catch {
      // Якщо батч не пройшов — зупиняємось (наступна синхронізація повторить)
      break
    }
  }

  return totalPushed
}

// Завантажуємо оновлені авто з сервера (з retry та пагінацією)
async function pullVehicles(): Promise<number> {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY) || '1970-01-01T00:00:00Z'
  let total = 0
  let page = 0
  const limit = 500

  try {
    while (true) {
      const url = `/api/vehicles/sync?since=${encodeURIComponent(lastSync)}&limit=${limit}&offset=${page * limit}`

      const vehicles: object[] = await withRetry(async () => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Pull failed: ${res.status}`)
        return res.json()
      })

      if (!Array.isArray(vehicles) || vehicles.length === 0) break

      await localDb.vehicles.bulkPut(vehicles as Parameters<typeof localDb.vehicles.bulkPut>[0])
      total += vehicles.length

      if (vehicles.length < limit) break
      page++
    }

    if (total > 0) {
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
    }

    return total
  } catch {
    return 0
  }
}

// Перше завантаження — скинути lastSync і витягти все
export async function fullSync(): Promise<void> {
  localStorage.removeItem(LAST_SYNC_KEY)
  await localDb.vehicles.clear()
  await pullVehicles()
}

// Завантажуємо аварійний список
async function pullEmergencyVehicles(): Promise<number> {
  try {
    const vehicles: object[] = await withRetry(async () => {
      const res = await fetch('/api/emergency/sync')
      if (!res.ok) throw new Error(`Emergency sync failed: ${res.status}`)
      return res.json()
    })
    if (!Array.isArray(vehicles)) return 0
    await localDb.emergencyVehicles.clear()
    await localDb.emergencyVehicles.bulkPut(vehicles as Parameters<typeof localDb.emergencyVehicles.bulkPut>[0])
    return vehicles.length
  } catch {
    return 0
  }
}
