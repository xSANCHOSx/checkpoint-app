'use client'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/hooks/useSync'
import Link from 'next/link'

export default function AdminPage() {
  const { user } = useAuth()
  const { isOnline, isSyncing, lastSyncTime, syncError, manualSync } = useSync()

  const formatTime = (date: Date | null) => {
    if (!date) return '—'
    return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <main className="max-w-5xl mx-auto px-6 py-8">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Авто */}
          <Link
            href="/admin/vehicles"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="text-3xl mb-3">🚗</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              Список автомобілів
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Додавання, редагування, видалення. Імпорт з Excel.
            </p>
          </Link>

          {/* Журнал */}
          <Link
            href="/admin/logs"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="text-3xl mb-3">📋</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              Журнал проїздів
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Перегляд всіх зафіксованих проїздів. Фільтр за датою.
            </p>
          </Link>

          {/* Імпорт Excel */}
          <Link
            href="/admin/import"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="text-3xl mb-3">📊</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              Імпорт Excel
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Google Drive або файл. Підтримує шаблон по листах та довільні колонки.
            </p>
          </Link>

          {/* VIP список */}
          <Link
            href="/admin/emergency"
            className="bg-white rounded-xl border border-blue-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="text-3xl mb-3">👑</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              VIP список
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Авто що завжди пропускаються. Директор, охорона, ДСНС.
            </p>
          </Link>

          {/* Проекти */}
          <Link
            href="/admin/projects"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="text-3xl mb-3">📁</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              Проекти
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Групування авто по проектах. Вмикати/вимикати, видаляти цілий проект.
            </p>
          </Link>

          {/* Компанії */}
          <Link
            href="/admin/companies"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="text-3xl mb-3">🏢</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              Компанії
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Групування авто по компаніях. Вмикати/вимикати, видаляти цілу компанію.
            </p>
          </Link>

          {/* Користувачі — тільки для адміна */}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin/users"
              className="bg-white rounded-xl border border-purple-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="text-3xl mb-3">👥</div>
              <h2 className="text-lg font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">
                Користувачі
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Додавання операторів та адміністраторів. Зміна паролів та ролей.
              </p>
            </Link>
          )}

          {/* Налаштування — тільки для адміна */}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin/settings"
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="text-3xl mb-3">⚙️</div>
              <h2 className="text-lg font-semibold text-gray-800 group-hover:text-gray-600 transition-colors">
                Налаштування
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Авторизація операторів та параметри системи.
              </p>
            </Link>
          )}

        </div>

        {/* Синхронізація */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Синхронізація даних
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={isOnline ? 'text-green-700' : 'text-red-600'}>
                {isOnline ? 'Онлайн' : 'Офлайн'}
              </span>
            </div>
            <span className="text-gray-400 text-sm">
              Остання синхронізація: {formatTime(lastSyncTime)}
            </span>
            {syncError && (
              <span className="text-red-500 text-sm font-medium">⚠ {syncError}</span>
            )}
            <button
              onClick={manualSync}
              disabled={!isOnline || isSyncing}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSyncing ? '⏳ Синхронізація...' : '🔄 Синхронізувати зараз'}
            </button>
          </div>
        </div>

        {/* Швидкі дії */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Швидкі дії
          </h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/cron"
              target="_blank"
              onClick={e => {
                e.preventDefault()
                fetch('/api/cron', {
                  headers: {
                    'x-cron-secret': prompt('Введіть CRON_SECRET:') || '',
                  },
                })
                  .then(r => r.json())
                  .then(d =>
                    alert(
                      `Позначено прострочених: ${d.markedExpired}\nВидалено: ${d.deleted}`
                    )
                  )
                  .catch(() => alert('Помилка або неправильний секрет'))
              }}
              className="px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm hover:bg-orange-100 transition-colors cursor-pointer"
            >
              🔄 Запустити cron вручну
            </a>
            
          </div>
        </div>
      </main>
    </div>
  )
}