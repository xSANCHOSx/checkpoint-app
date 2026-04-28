'use client'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { useEffect, useState } from 'react'

interface Settings {
  effective: boolean
  cookieValue: boolean
  envOverride: boolean | null
  lockedByEnv: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  const toggle = async () => {
    if (!settings || settings.lockedByEnv) return
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorAuthRequired: !settings.cookieValue }),
    })
    await load()
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="⚙️ Налаштування" />

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Авторизація оператора */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            🔐 Авторизація на КПП
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Коли увімкнено — оператор повинен увійти щоб використовувати сторінку пошуку авто.
            Вимкніть під час тестування.
          </p>

          {settings === null ? (
            <div className="text-sm text-gray-400">Завантаження...</div>
          ) : (
            <>
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">
                    Авторизація для оператора
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    Поточний стан:{' '}
                    <span className={`font-semibold ${settings.effective ? 'text-green-600' : 'text-orange-500'}`}>
                      {settings.effective ? 'Увімкнена ✅' : 'Вимкнена (режим тестування) 🔓'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={toggle}
                  disabled={saving || settings.lockedByEnv}
                  title={settings.lockedByEnv ? 'Заблоковано ENV змінною AUTH_OPERATOR_REQUIRED' : ''}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    settings.effective ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                      settings.effective ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* ENV override warning */}
              {settings.lockedByEnv && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  ⚠️ Тоггл заблоковано ENV змінною{' '}
                  <code className="font-mono bg-amber-100 px-1 rounded">AUTH_OPERATOR_REQUIRED={String(settings.envOverride)}</code>.
                  Щоб розблокувати — видаліть змінну з <code className="font-mono bg-amber-100 px-1 rounded">.env</code> і перезапустіть сервер.
                </div>
              )}
            </>
          )}
        </div>

        {/* Інструкція */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            📖 Способи перемикання
          </h2>
          <div className="space-y-4 text-sm text-gray-600">

            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">1</div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">Тоггл вище (рекомендовано)</div>
                Одразу, без рестарту. Зберігається в підписаному cookie на сервері.
              </div>
            </div>

            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">2</div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">ENV змінна (одна строчка в коді)</div>
                <code className="block bg-gray-100 rounded px-3 py-2 font-mono text-xs mt-1">
                  # .env.local{'\n'}
                  AUTH_OPERATOR_REQUIRED=false   # вимкнути{'\n'}
                  AUTH_OPERATOR_REQUIRED=true    # увімкнути
                </code>
                <div className="text-xs text-gray-400 mt-1">
                  Потребує рестарту сервера. Має вищий пріоритет ніж тоггл — блокує його.
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}