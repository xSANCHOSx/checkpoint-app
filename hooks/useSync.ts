'use client'
import { getPendingCount } from '@/lib/localDb'
import { fullSync, shouldPerformFullSync, syncAll } from '@/lib/sync'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useOnlineStatus } from './useOnlineStatus'

const SYNC_INTERVAL_MS = 30 * 60 * 1000 // 30 хвилин

export function useSync() {
  const isOnline = useOnlineStatus()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const initRef = useRef(false)

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
    if (initRef.current) return
    initRef.current = true

    refreshPendingCount()

    const initializeSync = async () => {
      try {
        // Перевірити чи потрібна повна синхронізація
        const needsFullSync = await shouldPerformFullSync()

        if (needsFullSync && isOnline) {
          setIsSyncing(true)
          await fullSync()
          setIsSyncing(false)
          setLastSyncTime(new Date())
          refreshPendingCount()
        } else if (isOnline) {
          // Якщо локальна БД вже має дані, виконати дельта-синхронізацію
          setIsSyncing(true)
          await syncAll()
          setIsSyncing(false)
          setLastSyncTime(new Date())
          refreshPendingCount()
        }
      } catch (error) {
        console.error('Initialization sync failed:', error)
      }
    }

    initializeSync()
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
