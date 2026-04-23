'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { syncAll, fullSync } from '@/lib/sync'
import { getPendingCount } from '@/lib/localDb'

const SYNC_INTERVAL_MS = 30 * 60 * 1000 // 30 хвилин

export function useSync() {
  const isOnline = useOnlineStatus()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  // ✅ ВИПРАВЛЕНО: оновлюємо лічильник несинхронізованих логів
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount()
      setPendingCount(count)
    } catch {
      // IndexedDB ще не ініціалізована — ігноруємо
    }
  }, [])

  // При першому завантаженні — перевірити чи є дані в IndexedDB
  useEffect(() => {
    refreshPendingCount()

    const isFirstTime =
      typeof localStorage !== 'undefined' &&
      !localStorage.getItem('checkpoint_last_sync')

    if (isFirstTime && isOnline) {
      setIsSyncing(true)
      fullSync().finally(() => {
        setIsSyncing(false)
        setLastSyncTime(new Date())
        refreshPendingCount()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // При появі інтернету — синхронізуємо
  useEffect(() => {
    if (!isOnline) {
      refreshPendingCount() // оновити лічильник при виході офлайн
      return
    }

    const doSync = async () => {
      setIsSyncing(true)
      await syncAll()
      setIsSyncing(false)
      setLastSyncTime(new Date())
      refreshPendingCount()
    }

    doSync()

    intervalRef.current = setInterval(doSync, SYNC_INTERVAL_MS)
    return () => clearInterval(intervalRef.current)
  }, [isOnline, refreshPendingCount])

  return { isOnline, isSyncing, lastSyncTime, pendingCount, refreshPendingCount }
}
