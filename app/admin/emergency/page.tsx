'use client'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { normalizePlate } from '@/lib/plateUtils'
import { useEffect, useState } from 'react'

interface EmergencyVehicle {
  id: number
  plate: string
  note: string | null
  addedBy: string | null
  createdAt: string
}

export default function EmergencyPage() {
  const [vehicles, setVehicles] = useState<EmergencyVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [plate, setPlate] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/emergency')
      setVehicles(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    const normalizedPlate = normalizePlate(plate)
    if (normalizedPlate.length < 4) { setError('Введіть коректний номер авто'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate: normalizedPlate, note }),
      })
      if (!res.ok) { const j = await res.json(); setError(j.error); return }
      setPlate('')
      setNote('')
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number, p: string) => {
    if (!confirm(`Видалити ${p} з VIP списку?`)) return
    await fetch(`/api/emergency/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="👑 VIP список" />

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        {/* Пояснення */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          🚨 Авто з цього списку <strong>завжди отримують дозвіл</strong> незалежно від основної бази.
          Використовуйте для: директора, VIP-персон, охорони, ДСНС, швидкої.
        </div>

        {/* Форма додавання */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Додати авто</h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={plate}
              onChange={e => setPlate(e.target.value.toUpperCase())}
              placeholder="AA1234BB"
              maxLength={10}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            />
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Примітка (необов'язково)"
              className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !plate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? '...' : '+ Додати'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">⚠ {error}</p>}
        </div>

        {/* Список */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Завантаження...</div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🚨</div>
              <div>VIP список порожній</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Номер</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Примітка</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Додано</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-800">{v.plate}</td>
                    <td className="px-4 py-3 text-gray-600">{v.note || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(v.createdAt).toLocaleDateString('uk-UA')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(v.id, v.plate)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Видалити
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}