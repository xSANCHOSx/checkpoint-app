'use client'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { useCallback, useEffect, useState } from 'react'

interface User {
  id: number
  username: string
  role: 'ADMIN' | 'OPERATOR'
  createdAt: string
  lastLoginAt: string | null
}

interface CurrentUser {
  id: number
  username: string
  role: string
}

const ROLE_LABELS = {
  ADMIN: { label: 'Адмін', color: 'bg-purple-100 text-purple-700' },
  OPERATOR: { label: 'Оператор', color: 'bg-blue-100 text-blue-700' },
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Форма нового користувача
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Форма зміни пароля
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newPass, setNewPass] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, meRes] = await Promise.all([
        fetch('/api/auth/users'),
        fetch('/api/auth/me'),
      ])
      setUsers(await usersRes.json())
      setCurrentUser(await meRes.json())
    } catch {
      setError('Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error); return }
      setNewUsername('')
      setNewPassword('')
      setNewRole('OPERATOR')
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (id: number) => {
    if (newPass.length < 8) { alert('Мінімум 8 символів'); return }
    const res = await fetch(`/api/auth/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass }),
    })
    if (res.ok) { setEditingId(null); setNewPass(''); load() }
    else { const d = await res.json(); alert(d.error) }
  }

  const handleChangeRole = async (user: User) => {
    const newRole = user.role === 'ADMIN' ? 'OPERATOR' : 'ADMIN'
    if (!confirm(`Змінити роль ${user.username} на "${ROLE_LABELS[newRole].label}"?`)) return
    const res = await fetch(`/api/auth/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) load()
    else { const d = await res.json(); alert(d.error) }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Видалити користувача "${user.username}"?`)) return
    const res = await fetch(`/api/auth/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) load()
    else { const d = await res.json(); alert(d.error) }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="👥 Користувачі" />

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">⚠ {error}</div>
        )}

        {/* Форма нового користувача */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Новий користувач</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="Логін"
                required
                minLength={3}
                pattern="[a-zA-Z0-9_.\-]+"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Пароль (мін. 8 символів)"
                required
                minLength={8}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as 'ADMIN' | 'OPERATOR')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="OPERATOR">Оператор</option>
                <option value="ADMIN">Адмін</option>
              </select>
            </div>
            {saveError && <p className="text-red-500 text-sm">⚠ {saveError}</p>}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? '...' : '+ Додати'}
            </button>
          </form>
        </div>

        {/* Список */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Завантаження...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Логін</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Роль</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Останній вхід</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => {
                  const isSelf = u.id === currentUser?.id
                  const roleInfo = ROLE_LABELS[u.role]
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {u.username}
                        {isSelf && <span className="ml-2 text-xs text-gray-400">(ви)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                        {formatDate(u.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {/* Зміна пароля */}
                          {editingId === u.id ? (
                            <div className="flex gap-1">
                              <input
                                type="password"
                                value={newPass}
                                onChange={e => setNewPass(e.target.value)}
                                placeholder="Новий пароль"
                                minLength={8}
                                autoFocus
                                className="w-32 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                              <button
                                onClick={() => handleChangePassword(u.id)}
                                className="text-green-600 hover:text-green-800 text-xs font-medium"
                              >✓</button>
                              <button
                                onClick={() => { setEditingId(null); setNewPass('') }}
                                className="text-gray-400 hover:text-gray-600 text-xs"
                              >✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingId(u.id)}
                              className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                            >
                              Пароль
                            </button>
                          )}

                          {/* Зміна ролі */}
                          {!isSelf && (
                            <button
                              onClick={() => handleChangeRole(u)}
                              className="text-purple-500 hover:text-purple-700 text-xs font-medium"
                            >
                              {u.role === 'ADMIN' ? '→ Оператор' : '→ Адмін'}
                            </button>
                          )}

                          {/* Видалення */}
                          {!isSelf && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="text-red-400 hover:text-red-600 text-xs font-medium"
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-xs text-gray-400 px-1">
          💡 Адмін — повний доступ до всіх розділів. Оператор — тільки перегляд (журнал). Операторам доступний публічний API для запису проїздів.
        </div>
      </main>
    </div>
  )
}