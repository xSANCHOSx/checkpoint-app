'use client'
import { SearchInput } from '@/components/SearchInput'
import { SyncIndicator } from '@/components/SyncIndicator'
import { VehicleCard } from '@/components/VehicleCard'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSearch } from '@/hooks/useSearch'
import { useSync } from '@/hooks/useSync'
import { useState } from 'react'

export default function OperatorPage() {
  const { digits, setDigits, results, isLoading } = useSearch()
  const { refreshPendingCount } = useSync()
  const [showText, setShowText] = useState(false)
  const [textQuery, setTextQuery] = useState('')

  const handleTextChange = (val: string) => {
    setTextQuery(val)
    setDigits(val.toUpperCase())
  }

  const toggleText = () => {
    setShowText(s => !s)
    setDigits('')
    setTextQuery('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">🚗 КПП</h1>
        <div className="flex items-center gap-3">
          <SyncIndicator />
          <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Адмін →
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Офлайн банер */}
        {!useOnlineStatus() && (
          <div className="mb-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl px-4 py-2 text-xs text-center">
            📴 Офлайн — пошук по локальній копії бази
          </div>
        )}
        {/* Цифровий пошук */}
        {!showText && <SearchInput value={digits} onChange={setDigits} />}

        {/* Іменний пошук */}
        {showText && (
          <input
            type="text"
            value={textQuery}
            onChange={e => handleTextChange(e.target.value)}
            placeholder="BOSS, UKRAINE, СЛАВА..."
            autoFocus
            className="w-full text-center text-3xl font-mono font-bold tracking-widest uppercase px-4 py-5 border-2 border-blue-400 rounded-2xl focus:outline-none focus:border-blue-600 bg-white shadow-sm"
          />
        )}

        {/* Кнопка перемикача */}
        <div className="flex justify-end mt-2">
          <button
            onClick={toggleText}
            className="text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            {showText ? '🔢 Цифровий пошук' : '🔤 Іменний номер'}
          </button>
        </div>

        {isLoading && (
          <div className="text-center text-gray-400 mt-8 animate-pulse">Пошук...</div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="mt-4">
            {results.map(v => (
              <VehicleCard key={v.id} vehicle={v} onLogged={refreshPendingCount} />
            ))}
          </div>
        )}

        {!isLoading && digits.length >= 2 && results.length === 0 && (
          <div className="text-center mt-16">
            <div className="text-5xl mb-4">🔍</div>
            <div className="text-gray-500 text-lg font-medium">Автомобіль не знайдено</div>
            <div className="text-gray-400 text-sm mt-1">«{digits}»</div>
          </div>
        )}

        {digits.length === 0 && (
          <div className="text-center mt-16 text-gray-300 select-none">
            {showText ? (
              <>
                <div className="text-6xl mb-4">🔤</div>
                <div className="text-lg">Введіть іменний номер</div>
                <div className="text-sm mt-1">напр. BOSS або UKRAINE</div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🔢</div>
                <div className="text-lg">Введіть цифри з номера</div>
                <div className="text-sm mt-1">мінімум 2 цифри</div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}