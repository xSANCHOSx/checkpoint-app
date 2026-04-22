'use client'
import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">
              ← КПП
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-xl font-bold text-gray-800">⚙️ Адміністратор</h1>
          </div>
        </div>
      </header>

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

        </div>

        {/* Швидкі дії */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
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
            <a
              href="/admin/vehicles?import=1"
              className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm hover:bg-green-100 transition-colors"
            >
              📊 Імпортувати Excel
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
