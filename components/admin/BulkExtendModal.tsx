'use client'
import { useState } from 'react'

interface Props {
  count: number
  onClose: () => void
  onConfirm: (expiresAt: string | null) => Promise<void>
}

export function BulkExtendModal({ count, onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<'date' | 'permanent'>('date')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Shortcuts — +30/+90/+180 днів від сьогодні
  const setRelative = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().split('T')[0])
    setMode('date')
  }

  const handleConfirm = async () => {
    if (mode === 'date' && !date) { setError('Виберіть дату'); return }
    setSaving(true)
    setError(null)
    try {
      await onConfirm(mode === 'permanent' ? null : date)
    } catch {
      setError('Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            ⏳ Продовження термінів
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Обрано: <strong>{count}</strong> авто
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Тип */}
          <div className="flex gap-3">
            <button
              onClick={() => setMode('date')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                mode === 'date'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              До дати
            </button>
            <button
              onClick={() => setMode('permanent')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                mode === 'permanent'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              ♾️ Постійний
            </button>
          </div>

          {mode === 'date' && (
            <>
              {/* Швидкі кнопки */}
              <div className="flex gap-2">
                {[30, 90, 180, 365].map(days => (
                  <button
                    key={days}
                    onClick={() => setRelative(days)}
                    className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                  >
                    +{days}д
                  </button>
                ))}
              </div>

              {/* Дата вручну */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Або вкажіть дату
                </label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {mode === 'permanent' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
              Всі обрані авто отримають <strong>постійний пропуск</strong> без дати закінчення.
            </div>
          )}

          {error && <p className="text-red-500 text-sm">⚠ {error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Скасувати
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? '⏳ Збереження...' : `Оновити ${count} авто`}
          </button>
        </div>
      </div>
    </div>
  )
}
