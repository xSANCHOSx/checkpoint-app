'use client'
import { SearchInput } from '@/components/SearchInput'
import { VehicleCard } from '@/components/VehicleCard'
import { SyncIndicator } from '@/components/SyncIndicator'
import { useSearch } from '@/hooks/useSearch'
import { useSync } from '@/hooks/useSync'

export default function OperatorPage() {
  const { digits, setDigits, results, isLoading } = useSearch()
  const { refreshPendingCount } = useSync()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Хедер */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">🚗 КПП</h1>
        <div className="flex items-center gap-3">
          <SyncIndicator />
          <a
            href="/admin"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Адмін →
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Поле вводу */}
        <SearchInput value={digits} onChange={setDigits} />

        {/* Стан завантаження */}
        {isLoading && (
          <div className="text-center text-gray-400 mt-8 animate-pulse">
            Пошук...
          </div>
        )}

        {/* Результати */}
        {!isLoading && results.length > 0 && (
          <div className="mt-6">
            {results.map(v => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                onLogged={refreshPendingCount}
              />
            ))}
          </div>
        )}

        {/* Не знайдено */}
        {!isLoading && digits.length >= 2 && results.length === 0 && (
          <div className="text-center mt-16">
            <div className="text-5xl mb-4">🔍</div>
            <div className="text-gray-500 text-lg font-medium">
              Автомобіль не знайдено
            </div>
            <div className="text-gray-400 text-sm mt-1">
              Цифри: &ldquo;{digits}&rdquo;
            </div>
          </div>
        )}

        {/* Підказка початкового стану */}
        {digits.length === 0 && (
          <div className="text-center mt-16 text-gray-300 select-none">
            <div className="text-6xl mb-4">🔢</div>
            <div className="text-lg">Введіть цифри з номера</div>
            <div className="text-sm mt-1">мінімум 2 цифри</div>
          </div>
        )}
      </main>
    </div>
  )
}
