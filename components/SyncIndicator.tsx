'use client'
import { useSync } from '@/hooks/useSync'

export function SyncIndicator() {
  const { isOnline, isSyncing, lastSyncTime, pendingCount, syncError, manualSync } = useSync()

  const formatTime = (date: Date | null) => {
    if (!date) return null
    return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex items-center gap-2 text-sm select-none">
      <div
        className={`w-2 h-2 rounded-full transition-colors ${
          isOnline ? 'bg-green-500' : 'bg-red-500'
        } ${isSyncing ? 'animate-pulse' : ''}`}
      />
      <span className={`font-medium ${isOnline ? 'text-green-700' : 'text-red-600'}`}>
        {isOnline ? (isSyncing ? 'Синхронізація...' : 'Онлайн') : 'Офлайн'}
      </span>

      {isOnline && lastSyncTime && !isSyncing && (
        <span className="text-gray-400 text-xs hidden sm:inline">
          {formatTime(lastSyncTime)}
        </span>
      )}

      {!isOnline && pendingCount > 0 && (
        <span className="text-orange-600 text-xs font-medium">
          · {pendingCount} очікують
        </span>
      )}

      {syncError && (
        <span className="text-red-500 text-xs font-medium" title={syncError}>
          ⚠ Помилка
        </span>
      )}

      {isOnline && !isSyncing && (
        <button
          onClick={manualSync}
          title="Синхронізувати зараз"
          className="text-gray-400 hover:text-blue-600 transition-colors text-xs ml-1"
          aria-label="Ручна синхронізація"
        >
          🔄
        </button>
      )}
    </div>
  )
}
