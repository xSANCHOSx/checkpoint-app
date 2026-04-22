'use client'
import { useState, useRef } from 'react'

interface Props {
  onClose: () => void
  onImported: () => void
}

interface ImportResult {
  imported: number
  updated: number
  total: number
  errors: string[]
}

export function ExcelImport({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Помилка імпорту')
        return
      }

      setResult(data)
    } catch {
      setError('Помилка мережі')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">📊 Імпорт з Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Інструкція */}
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <div className="font-semibold mb-2">Очікуваний формат колонок:</div>
            <div className="grid grid-cols-2 gap-1 font-mono text-xs">
              <span>Номер авто</span><span className="text-blue-500">обов&apos;язкове</span>
              <span>Компанія</span><span className="text-blue-500">обов&apos;язкове</span>
              <span>Дійсний до</span><span className="text-gray-500">дата (для тимчасових)</span>
              <span>Контакт</span><span className="text-gray-500">необов&apos;язкове</span>
              <span>Телефон</span><span className="text-gray-500">необов&apos;язкове</span>
              <span>Примітка</span><span className="text-gray-500">необов&apos;язкове</span>
            </div>
          </div>

          {/* Вибір файлу */}
          <div
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => {
                setFile(e.target.files?.[0] ?? null)
                setResult(null)
                setError('')
              }}
            />
            {file ? (
              <div>
                <div className="text-3xl mb-2">📄</div>
                <div className="font-medium text-green-700">{file.name}</div>
                <div className="text-sm text-green-600 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">📂</div>
                <div className="font-medium text-gray-600">
                  Натисніть або перетягніть файл
                </div>
                <div className="text-sm text-gray-400 mt-1">.xlsx або .xls</div>
              </div>
            )}
          </div>

          {/* Результат */}
          {result && (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="font-semibold text-green-800 mb-2">
                ✅ Імпорт завершено
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <div>Нових авто: <strong>{result.imported}</strong></div>
                <div>Оновлено: <strong>{result.updated}</strong></div>
                <div>Всього рядків: <strong>{result.total}</strong></div>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-semibold text-orange-700 mb-1">
                    ⚠️ Попередження ({result.errors.length}):
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={result ? onImported : onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {result ? 'Закрити' : 'Скасувати'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? 'Імпортування...' : 'Імпортувати'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
