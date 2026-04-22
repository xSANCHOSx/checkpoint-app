'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { LogList } from '@/components/LogList'

export interface LogEntry {
  id: number
  plate: string
  result: 'ALLOWED' | 'DENIED' | 'UNKNOWN'
  timestamp: string
  syncedAt: string | null
  note: string | null
  vehicle: { company: string; accessType: string } | null
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)

  const LIMIT = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(date && { date }),
      })
      const res = await fetch(`/api/logs?${params}`)
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, date])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">
              ← Адмін
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-xl font-bold text-gray-800">📋 Журнал проїздів</h1>
            <span className="text-sm text-gray-500">({total})</span>
          </div>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Завантаження...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <div>Записів за цю дату немає</div>
          </div>
        ) : (
          <LogList logs={logs} />
        )}

        {total > LIMIT && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              ← Назад
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              {page} / {Math.ceil(total / LIMIT)}
            </span>
            <button
              disabled={page >= Math.ceil(total / LIMIT)}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Далі →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
