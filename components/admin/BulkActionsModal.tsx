'use client'
import { useEffect, useState } from 'react'

interface Project {
  id: number
  name: string
}

type BulkAction =
  | 'extend'
  | 'set_permanent'
  | 'set_project'
  | 'set_expired'
  | 'set_active'
  | 'delete'

interface Props {
  count: number
  action: BulkAction
  onClose: () => void
  onConfirm: (payload: Record<string, unknown>) => Promise<void>
}

export function BulkActionsModal({ count, action, onClose, onConfirm }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [projectId, setProjectId] = useState<number | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    if (action === 'set_project') {
      fetch('/api/projects')
        .then(r => r.json())
        .then(setProjects)
        .catch(() => {})
    }
  }, [action])

  const setRelative = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().split('T')[0])
  }

  const handleConfirm = async () => {
    setSaving(true)
    setError(null)
    try {
      let payload: Record<string, unknown> = {}

      if (action === 'extend') {
        if (!date) { setError('Виберіть дату'); setSaving(false); return }
        payload = { expiresAt: date }
      } else if (action === 'set_permanent') {
        payload = { expiresAt: null, accessType: 'PERMANENT' }
      } else if (action === 'set_project') {
        payload = { projectId }
      } else if (action === 'set_expired') {
        payload = { isExpired: true }
      } else if (action === 'set_active') {
        payload = { isExpired: false }
      } else if (action === 'delete') {
        payload = { delete: true }
      }

      await onConfirm(payload)
    } catch {
      setError('Помилка. Спробуйте ще раз.')
    } finally {
      setSaving(false)
    }
  }

  const CONFIG: Record<BulkAction, { icon: string; title: string; confirmLabel: string; danger?: boolean }> = {
    extend:        { icon: '⏳', title: 'Продовжити термін',       confirmLabel: 'Оновити' },
    set_permanent: { icon: '♾️', title: 'Зробити постійними',      confirmLabel: 'Зробити постійними' },
    set_project:   { icon: '📁', title: 'Призначити проект',        confirmLabel: 'Призначити' },
    set_expired:   { icon: '🔴', title: 'Заблокувати доступ',       confirmLabel: 'Заблокувати', danger: true },
    set_active:    { icon: '🟢', title: 'Розблокувати доступ',      confirmLabel: 'Розблокувати' },
    delete:        { icon: '🗑',  title: 'Видалити авто',            confirmLabel: 'Видалити все', danger: true },
  }

  const cfg = CONFIG[action]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">{cfg.icon} {cfg.title}</h2>
          <p className="text-sm text-gray-500 mt-1">Обрано: <strong>{count}</strong> авто</p>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Продовження терміну */}
          {action === 'extend' && (
            <>
              <div className="flex gap-2 flex-wrap">
                {[30, 90, 180, 365].map(d => (
                  <button key={d} onClick={() => setRelative(d)}
                    className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">
                    +{d}д
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Або вкажіть дату</label>
                <input type="date" value={date} min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          )}

          {/* Постійний */}
          {action === 'set_permanent' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
              Всі обрані авто отримають <strong>постійний пропуск</strong> без дати закінчення.
            </div>
          )}

          {/* Призначити проект */}
          {action === 'set_project' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Проект</label>
              <select value={projectId ?? ''}
                onChange={e => setProjectId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Без проекту —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Заблокувати */}
          {action === 'set_expired' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
              Всі обрані авто отримають статус <strong>ЗАБЛОКОВАНО</strong>. Доступ буде заборонено.
            </div>
          )}

          {/* Розблокувати */}
          {action === 'set_active' && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
              З обраних авто буде знято блокування. Доступ відновиться.
            </div>
          )}

          {/* Видалення */}
          {action === 'delete' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
              ⚠️ <strong>{count} авто</strong> буде видалено назавжди. Це незворотня дія.
            </div>
          )}

          {error && <p className="text-red-500 text-sm">⚠ {error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Скасувати
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-40 font-medium ${
              cfg.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}>
            {saving ? '⏳ ...' : `${cfg.confirmLabel} (${count})`}
          </button>
        </div>
      </div>
    </div>
  )
}