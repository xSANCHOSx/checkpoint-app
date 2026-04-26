'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Project {
  id: number
  name: string
  active: boolean
  note: string | null
  createdAt: string
  _count: { vehicles: number }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects')
      setProjects(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!name.trim()) { setError('Введіть назву проекту'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
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

  const toggleActive = async (p: Project) => {
    if (!p.active) {
      // включаємо без підтвердження
      await fetch(`/api/projects/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })
    } else {
      // вимикаємо з попередженням
      if (!confirm(
        `Вимкнути проект "${p.name}"?\n\n` +
        `Всі ${p._count.vehicles} авто отримають статус ЗАБОРОНЕНО\n` +
        `та примітку "Проект закінчено".`
      )) return

      await fetch(`/api/projects/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      })
    }
    load()
  }

  const handleDelete = async (p: Project) => {
    const hasVehicles = p._count.vehicles > 0

    let deleteVehicles = false
    if (hasVehicles) {
      deleteVehicles = confirm(
        `Проект "${p.name}" містить ${p._count.vehicles} авто.\n\n` +
        `OK — видалити разом з авто\n` +
        `Скасувати — залишити авто`
      )
    } else {
      if (!confirm(`Видалити проект "${p.name}"?`)) return
    }

    await fetch(`/api/projects/${p.id}?deleteVehicles=${deleteVehicles}`, {
      method: 'DELETE',
    })
    load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Адмін</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-xl font-bold text-gray-800">📁 Проекти</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        {/* Пояснення */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <strong>Логіка:</strong> вимкнений проект → авто = <strong>ЗАБОРОНЕНО</strong> + "Проект закінчено". При повторному вмиканні — відновлення.
        </div>

        {/* Форма */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Новий проект</h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Назва проекту"
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
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📁</div>
              <div>Проектів ще немає</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Проект</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Авто</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Статус</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 ${!p.active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{p.name}</div>
                      {p.note && <div className="text-xs text-gray-400 mt-0.5">{p.note}</div>}
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      <Link
                        href={`/admin/vehicles?project=${p.id}`}
                        className="hover:text-blue-600 underline decoration-dotted"
                      >
                        {p._count.vehicles} авто
                      </Link>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(p)}
                        title={p.active ? 'Вимкнути проект' : 'Увімкнути проект'}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          p.active
                            ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                            : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'
                        }`}
                      >
                        {p.active ? '✓ Активний' : '✗ Вимкнено'}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(p)}
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
          💡 Видалення проекту з авто — повністю чистить базу. Обережно.
        </div>
      </main>
    </div>
  )
}