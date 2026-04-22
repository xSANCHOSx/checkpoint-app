import { getLocalVehicleCount, getPendingLogs, localDb, markLogsSynced, syncVehiclesToLocal } from './localDb'

const LAST_SYNC_KEY = 'checkpoint_last_sync'

// Головна функція синхронізації — викликається при появі інтернету
export async function syncAll(): Promise<{ pulled: number; pushed: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { pulled: 0, pushed: 0 }
  }

  const [pushed, pulled] = await Promise.all([
    pushPendingLogs(),
    pullVehicles(),
  ])

  return { pulled, pushed }
}

// Відправляємо офлайн-логи на сервер
async function pushPendingLogs(): Promise<number> {
  const pending = await getPendingLogs()
  if (pending.length === 0) return 0

  try {
    const res = await fetch('/api/logs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending),
    })

    if (!res.ok) throw new Error('Push failed')

    const ids = pending.map(l => l.id!).filter(Boolean)
    await markLogsSynced(ids)

    return pending.length
  } catch {
    return 0
  }
}

// Завантажуємо оновлені авто з сервера
async function pullVehicles(): Promise<number> {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY) || '1970-01-01T00:00:00Z'

  try {
    const res = await fetch(
      `/api/vehicles/sync?since=${encodeURIComponent(lastSync)}`
    )
    if (!res.ok) throw new Error('Pull failed')

    const vehicles = await res.json()
    if (vehicles.length === 0) return 0

    // Синхронізуємо авто до локальної БД
    const synced = await syncVehiclesToLocal(vehicles)
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())

    return synced
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

// Перевірити чи потрібна повна синхронізація
export async function shouldPerformFullSync(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const hasLastSync = localStorage.getItem(LAST_SYNC_KEY)
  if (!hasLastSync) return true
  
  // Якщо локальна БД порожня, виконати повну синхронізацію
  const localCount = await getLocalVehicleCount()
  return localCount === 0
}
