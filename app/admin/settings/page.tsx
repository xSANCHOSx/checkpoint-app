'use client'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [authRequired, setAuthRequired] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => setAuthRequired(d.operatorAuthRequired))
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  const toggle = async () => {
    if (authRequired === null) return
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorAuthRequired: !authRequired }),
    })
    await load()
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="⚙️ Налаштування" />

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            🔐 Авторизація на КПП
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Коли увімкнено — оператор повинен увійти щоб використовувати сторінку пошуку авто.
            Вимкніть під час тестування.
          </p>

          {authRequired === null ? (
            <div className="text-sm text-gray-400">Завантаження...</div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800">Авторизація для оператора</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Стан:{' '}
                  <span className={`font-semibold ${authRequired ? 'text-green-600' : 'text-orange-500'}`}>
                    {authRequired ? '✅ Увімкнена' : '🔓 Вимкнена (тестовий режим)'}
                  </span>
                </div>
              </div>

              <button
                onClick={toggle}
                disabled={saving}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                  authRequired ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                  authRequired ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}