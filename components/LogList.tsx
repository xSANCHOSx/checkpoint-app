'use client'
import type { LogEntry } from '@/app/admin/logs/page'

interface Props {
  logs: LogEntry[]
}

const RESULT_CONFIG = {
  ALLOWED: { label: 'Дозволено', badge: 'bg-green-100 text-green-800', icon: '✅' },
  DENIED:  { label: 'Відмовлено', badge: 'bg-red-100 text-red-800',   icon: '🚫' },
  UNKNOWN: { label: 'Невідомо',  badge: 'bg-gray-100 text-gray-600',  icon: '❓' },
}

export function LogList({ logs }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold">Час</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold">Номер</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold">Компанія</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold">Результат</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Синх.</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => {
            const cfg = RESULT_CONFIG[log.result]
            const time = new Date(log.timestamp).toLocaleTimeString('uk-UA', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
            return (
              <tr
                key={log.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  i % 2 === 0 ? '' : 'bg-gray-50/50'
                }`}
              >
                <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">
                  {time}
                </td>
                <td className="px-4 py-3 font-mono font-bold text-gray-900">
                  {log.plate}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                  {log.vehicle?.company || <span className="text-gray-300 italic">не знайдено</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {log.syncedAt ? (
                    <span className="text-green-500 text-xs">✓</span>
                  ) : (
                    <span className="text-orange-400 text-xs">⏳</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
