'use client'
import type { Vehicle } from '@/app/admin/vehicles/page'
import { useState } from 'react'

interface Props {
  vehicle: Vehicle | null
  onClose: () => void
  onSaved: () => void
}

export function VehicleForm({ vehicle, onClose, onSaved }: Props) {
  const isEdit = !!vehicle

  const [form, setForm] = useState({
    plate:        vehicle?.plate        ?? '',
    company:      vehicle?.company      ?? '',
    contactName:  vehicle?.contactName  ?? '',
    contactPhone: vehicle?.contactPhone ?? '',
    accessType:   vehicle?.accessType   ?? 'PERMANENT',
    expiresAt:    vehicle?.expiresAt
      ? new Date(vehicle.expiresAt).toISOString().slice(0, 10)
      : '',
    note:         vehicle?.note         ?? '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key: string, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }))

  async function handleSubmit() {
    setError('')
    if (!form.plate.trim()) {
      setError('Номер авто обов\'язковий')
      return
    }
    setLoading(true)
    try {
      const body = {
        ...form,
        expiresAt: form.expiresAt || null,
        contactName: form.contactName || null,
        contactPhone: form.contactPhone || null,
        note: form.note || null,
      }
      const res = isEdit
        ? await fetch(`/api/vehicles/${vehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/vehicles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Помилка збереження')
        return
      }
      onSaved()
    } catch {
      setError('Помилка мережі')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? '✏️ Редагувати авто' : '➕ Нове авто'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Номер авто *
            </label>
            <input
              type="text"
              value={form.plate}
              onChange={e => set('plate', e.target.value.toUpperCase())}
              placeholder="AA1234BB"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Компанія / Організація *
            </label>
            <input
              type="text"
              value={form.company}
              onChange={e => set('company', e.target.value)}
              placeholder="ТОВ Приклад"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип пропуску
            </label>
            <select
              value={form.accessType}
              onChange={e => set('accessType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PERMANENT">♾️ Постійний</option>
              <option value="TEMPORARY">⏳ Тимчасовий</option>
              <option value="SINGLE_USE">1️⃣ Разовий (1 проїзд)</option>
            </select>
          </div>

          {form.accessType === 'SINGLE_USE' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
              ⚠️ Після першого пропуску авто автоматично отримає статус <strong>DENIED</strong>.
              Використовуйте для разових поставок, гостей, підрядників.
            </div>
          )}

          {form.accessType === 'TEMPORARY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дійсний до
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => set('expiresAt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Контактна особа
              </label>
              <input
                type="text"
                value={form.contactName}
                onChange={e => set('contactName', e.target.value)}
                placeholder="Іван Іваненко"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Телефон
              </label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={e => set('contactPhone', e.target.value)}
                placeholder="+380..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Примітка
            </label>
            <textarea
              value={form.note}
              onChange={e => set('note', e.target.value)}
              rows={2}
              placeholder="Необов'язково..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Скасувати
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Збереження...' : isEdit ? 'Зберегти' : 'Додати'}
          </button>
        </div>
      </div>
    </div>
  )
}
