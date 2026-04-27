'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useSync } from '@/hooks/useSync'

export default function AdminPage() {
  const { isOnline, isSyncing, lastSyncTime, syncError, manualSync } = useSync()
  const [cronSecret, setCronSecret] = useState('')
  const [cronResult, setCronResult] = useState<string | null>(null)
  const [cronLoading, setCronLoading] = useState(false)
  const [showCronForm, setShowCronForm] = useState(false)

  const formatTime = (date: Date | null) => {
    if (!date) return '—'
    return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
  }

  const runCron = async () => {
    if (!cronSecret) return
    setCronLoading(true)
    setCronResult(null)
    try {
      const res = await fetch('/api/cron', {
        headers: { 'x-cron-secret': cronSecret },
      })
      const d = await res.json()
      if (!res.ok) {
        setCronResult(`❌ Помилка: ${d.error || res.status}`)
      } else {
        setCronResult(`✅ Позначено прострочених: ${d.markedExpired} · Видалено: ${d.deleted}`)
      }
    } catch {
      setCronResult('❌ Помилка мережі')
    } finally {
      setCronLoading(false)
      setCronSecret('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← КПП</Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-xl font-bold text-gray-800">⚙️ Адміністратор</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Link href="/admin/vehicles" className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow group">
            <div className="text-3xl mb-3">🚗</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Список автомобілів</h2>
            <p className="text-sm text-gray-500 mt-1">Додавання, редагування, видалення. Імпорт з Excel.</p>
          </Link>

          <Link href="/admin/logs" className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow group">
            <div className="text-3xl mb-3">📋</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Журнал проїздів</h2>
            <p className="text-sm text-gray-500 mt-1">Перегляд всіх зафіксованих проїздів. Фільтр за датою та результатом.</p>
          </Link>

          <Link href="/admin/import" className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow group">
            <div className="text-3xl mb-3">📊</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Імпорт Excel</h2>
            <p className="text-sm text-gray-500 mt-1">Google Drive або файл. Підтримує шаблон по листах та довільні колонки.</p>
          </Link>

          <Link href="/admin/emergency" className="bg-white rounded-xl border border-blue-200 p-6 hover:shadow-md transition-shadow group">
            <div className="text-3xl mb-3">🚨</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Аварійний список</h2>
            <p className="text-sm text-gray-500 mt-1">Авто що завжди пропускаються. Директор, охорона, ДСНС.</p>
          </Link>

          <Link href="/admin/projects" className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow group">
            <div className="text-3xl mb-3">📁</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Проекти</h2>
            <p className="text-sm text-gray-500 mt-1">Групування авто по проектах. Вмикати/вимикати, видаляти цілий проект.</p>
          </Link>

        </div>

        {/* Синхронізація */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Синхронізація даних</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={isOnline ? 'text-green-700' : 'text-red-600'}>
                {isOnline ? 'Онлайн' : 'Офлайн'}
              </span>
            </div>
            <span className="text-gray-400 text-sm">Остання синхронізація: {formatTime(lastSyncTime)}</span>
            {syncError && <span className="text-red-500 text-sm font-medium">⚠ {syncError}</span>}
            <button
              onClick={manualSync}
              disabled={!isOnline || isSyncing}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSyncing ? '⏳ Синхронізація...' : '🔄 Синхронізувати зараз'}
            </button>
          </div>
        </div>

        {/* Ручний запуск cron — форма замість prompt() (#14) */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Службові дії</h2>
          <div className="flex flex-wrap gap-3 items-start">

            {!showCronForm ? (
              <button
                onClick={() => setShowCronForm(true)}
                className="px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm hover:bg-orange-100 transition-colors"
              >
                🔄 Запустити cron вручну
              </button>
            ) : (
              <div className="flex flex-col gap-2 w-full max-w-sm">
                <label className="text-xs font-semibold text-gray-600">CRON_SECRET</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={cronSecret}
                    onChange={e => setCronSecret(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runCron()}
                    placeholder="Введіть секрет..."
                    autoFocus
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    onClick={runCron}
                    disabled={cronLoading || !cronSecret}
                    className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-40"
                  >
                    {cronLoading ? '⏳' : '▶'}
                  </button>
                  <button
                    onClick={() => { setShowCronForm(false); setCronSecret(''); setCronResult(null) }}
                    className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    ✕
                  </button>
                </div>
                {cronResult && (
                  <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    {cronResult}
                  </div>
                )}
              </div>
            )}

            <Link
              href="/admin/import"
              className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm hover:bg-green-100 transition-colors"
            >
              📊 Імпортувати Excel
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
