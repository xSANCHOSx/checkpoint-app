'use client'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import type { SearchResult } from '@/hooks/useSearch'
import { savePendingLog } from '@/lib/localDb'
import { useState } from 'react'

interface Props {
  vehicle: SearchResult
  onLogged?: () => void
}

const STATUS_CONFIG = {
  allowed: {
    bg: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-800',
    icon: '✅',
    label: 'ДОЗВОЛЕНО',
    result: 'ALLOWED' as const,
  },
  denied: {
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-800',
    icon: '🚫',
    label: 'ВІДМОВЛЕНО',
    result: 'DENIED' as const,
  },
  expired: {
    bg: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
    icon: '⚠️',
    label: 'ПРОСТРОЧЕНО',
    result: 'DENIED' as const,
  },
}

const EMERGENCY_CONFIG = {
  bg: 'bg-amber-50 border-amber-400 border-2',
  badge: 'bg-amber-500 text-white',
  icon: '👑',
  label: 'VIP',
  result: 'ALLOWED' as const,
}

const SINGLE_USE_USED_CONFIG = {
  bg: 'bg-gray-50 border-gray-300',
  badge: 'bg-gray-200 text-gray-700',
  icon: '🔒',
  label: 'РАЗОВИЙ — ВИКОРИСТАНО',
  result: 'DENIED' as const,
}

function pluralDays(n: number): string {
  if (n === 1) return 'день'
  if (n >= 2 && n <= 4) return 'дні'
  return 'днів'
}

export function VehicleCard({ vehicle, onLogged }: Props) {
  const isOnline = useOnlineStatus()
  const [logged, setLogged] = useState(false)
  const [logging, setLogging] = useState(false)

  const isSingleUseUsed = vehicle.accessType === 'SINGLE_USE' && vehicle.isExpired
  const config = vehicle.isEmergency
    ? EMERGENCY_CONFIG
    : isSingleUseUsed
      ? SINGLE_USE_USED_CONFIG
      : STATUS_CONFIG[vehicle.status]

async function handleLog() {
  if (logging || logged) return
  setLogging(true)

  const logData = {
    plate: vehicle.plate,
    // Екстрені авто не є Vehicle — vehicleId має бути null
    vehicleId: vehicle.isEmergency ? null : vehicle.id,
    result: config.result,
    operatorId: null,
    note: vehicle.isEmergency ? 'Екстрений список' : null,
    timestamp: new Date().toISOString(),
  }

  try {
    if (isOnline) {
      await fetch('/api/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      })
    } else {
      await savePendingLog(logData)
    }
    setLogged(true)
    onLogged?.()
    // Без setTimeout — кнопка залишається "✓ Записано" до нового пошуку
  } catch {
    await savePendingLog(logData)
    setLogged(true)
    onLogged?.()
  } finally {
    setLogging(false)
  }
}

  return (
    <div className={`rounded-xl border-2 p-4 mb-3 ${config.bg} transition-all`}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Номер і статус */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-2xl font-bold font-mono tracking-wider text-gray-900">
              {vehicle.plate}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${config.badge}`}>
              {config.icon} {config.label}
            </span>
          </div>

          {/* Компанія */}
          <div className="text-lg text-gray-700 font-medium truncate">
            {vehicle.company}
          </div>

          {/* Тип пропуску */}
          <div className="text-sm text-gray-500 mt-1">
            {vehicle.accessType === 'SINGLE_USE' ? (
              isSingleUseUsed
                ? '🔒 Разовий пропуск — вже використано'
                : '1️⃣ Разовий пропуск — дійсний один раз'
            ) : vehicle.accessType === 'PERMANENT' ? (
              '♾️ Постійний пропуск'
            ) : vehicle.status === 'allowed' && vehicle.daysLeft !== null ? (
              `⏳ Тимчасовий · ще ${vehicle.daysLeft} ${pluralDays(vehicle.daysLeft)}`
            ) : vehicle.daysOverdue !== null ? (
              `❌ Прострочено ${vehicle.daysOverdue} ${pluralDays(vehicle.daysOverdue)} тому`
            ) : (
              '❌ Тимчасовий — прострочено'
            )}
          </div>

          {/* Контакт */}
          {vehicle.contactName && (
            <div className="text-sm text-gray-400 mt-1 truncate">
              👤 {vehicle.contactName}
              {vehicle.contactPhone && ` · ${vehicle.contactPhone}`}
            </div>
          )}


          {/* Примітка */}
          {vehicle.note && (
            <div className="text-xs text-gray-400 mt-1 italic truncate">
              💬 {vehicle.note}
            </div>
          )}
        </div>

        {/* Кнопка Записати */}
        <button
          onClick={handleLog}
          disabled={logged || logging}
          className={`shrink-0 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95
            ${logged
              ? 'bg-gray-100 text-gray-400 cursor-default'
              : logging
              ? 'bg-blue-300 text-white cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }`}
        >
          {logged ? '✓ Записано' : logging ? '...' : 'Записати'}
        </button>
      </div>

      {/* Проект — повна ширина внизу картки */}
      <span>proect</span>
      {vehicle.projectName && (
        <div className={`mt-3 pt-3 border-t ${
          vehicle.projectActive === false ? 'border-gray-200' : 'border-indigo-100'
        }`}>
          <div className={`flex items-center gap-2 text-sm font-medium ${
            vehicle.projectActive === false ? 'text-gray-400' : 'text-indigo-700'
          }`}>
            <span className="shrink-0">
              {vehicle.projectActive === false ? '⏸' : '📁'}
            </span>
            <span className="leading-snug">
              {vehicle.projectName}
              {vehicle.projectActive === false && (
                <span className="ml-2 text-xs font-normal text-gray-400">(вимкнено)</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}