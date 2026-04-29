'use client'
import { AdminHeader } from '@/components/admin/AdminHeader'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Company {
  id: number
  name: string
  active: boolean
  note: string | null
  createdAt: string
  _count: { vehicles: number }
}

function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      title={active ? 'Вимкнути компанію' : 'Увімкнути компанію'}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
        active ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          active ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/companies')
      setCompanies(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!name.trim()) { setError('Введіть назву компанії'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), note }),
      })
      if (!res.ok) { const j = await res.json(); setError(j.error); return }
      setName('')
      setNote('')
      load()
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c: Company) => {
    if (c.active) {
      if (!confirm(
        `Вимкнути компанію "${c.name}"?\n\n` +
        `Всі ${c._count.vehicles} авто отримають статус ЗАБОРОНЕНО\n` +
        `та примітку "Компанія закінчена".`
      )) return
    }

    await fetch(`/api/companies/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    })
    load()
  }

  const handleDelete = async (c: Company) => {
    const hasVehicles = c._count.vehicles > 0
    let deleteVehicles = false
    if (hasVehicles) {
      deleteVehicles = confirm(
        `Компанія "${c.name}" містить ${c._count.vehicles} авто.\n\n` +
        `OK — видалити разом з авто\n` +
        `Скасувати — залишити авто`
      )
    } else {
      if (!confirm(`Видалити компанію "${c.name}"?`)) return
    }

    await fetch(`/api/companies/${c.id}?deleteVehicles=${deleteVehicles}`, {
      method: 'DELETE',
    })
    load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="🏢 Компанії" />

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <strong>Логіка:</strong> вимкнена компанія → авто = <strong>ЗАБОРОНЕНО</strong> + &quot;Компанія закінчена&quot;. При повторному вмиканні — відновлення.
        </div>

        {/* Форма */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Нова компанія</h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Назва компанії"
              className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              disabled={saving || !name.trim()}
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
          ) : companies.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🏢</div>
              <div>Компаній ще немає</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Компанія</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Авто</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Активна</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className={`font-medium ${c.active ? 'text-gray-800' : 'text-gray-400'}`}>
                        {c.name}
                        {!c.active && (
                          <span className="ml-2 text-xs font-normal text-gray-400">(вимкнено)</span>
                        )}
                      </div>
                      {c.note && (
                        <div className={`text-xs mt-0.5 ${c.active ? 'text-gray-400' : 'text-gray-300'}`}>
                          {c.note}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      <Link
                        href={`/admin/vehicles?company=${c.id}`}
                        className={`underline decoration-dotted ${c.active ? 'hover:text-blue-600' : 'text-gray-400 hover:text-gray-500'}`}
                      >
                        {c._count.vehicles} авто
                      </Link>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Toggle active={c.active} onChange={() => toggleActive(c)} />
                        <span className={`text-xs ${c.active ? 'text-green-600' : 'text-gray-400'}`}>
                          {c.active ? 'Так' : 'Ні'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium"
                      >
                        🗑 Видалити
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-xs text-gray-400 px-1">
          💡 Видалення компанії з авто — повністю чистить базу. Обережно.
        </div>
      </main>
    </div>
  )
}
