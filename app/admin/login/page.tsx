'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isExpired = searchParams.get('expired') === '1'
  const from = searchParams.get('from') || '/admin'

  useEffect(() => {
    if (isExpired) setError('Сесія закінчилась. Увійдіть знову.')
  }, [isExpired])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Помилка входу'); return }
      router.push(from)
      router.refresh()
    } catch {
      setError('Помилка мережі')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🚗</div>
        <h1 className="text-2xl font-bold text-gray-900">КПП</h1>
        <p className="text-sm text-gray-500 mt-1">Адміністративна панель</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 text-center">Вхід</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логін</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {loading ? '⏳ Вхід...' : 'Увійти'}
          </button>
        </form>
      </div>
      <p className="text-center text-xs text-gray-400 mt-6">Checkpoint App · Адмін панель</p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="text-center text-gray-400">
          <div className="text-5xl mb-3">🚗</div>
          <div>Завантаження...</div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}