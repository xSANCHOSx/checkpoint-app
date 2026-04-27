'use client'
import { LogList } from '@/components/LogList'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { useCallback, useEffect, useState } from 'react'

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
  const [plate, setPlate] = useState('')
  const [loading, setLoading] = useState(true)

  const LIMIT = 50
  const today = new Date().toISOString().slice(0, 10)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(date && { date }),
        ...(plate && { plate }),
      })
      const res = await fetch(`/api/logs?${params}`)
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, date, plate])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="min-h-screen bg-gray-50">
            <AdminHeader title="📋 Журнал проїздів" />

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