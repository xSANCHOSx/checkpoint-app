'use client'
import { BulkActionsModal } from '@/components/admin/BulkActionsModal'
import { ExcelImport } from '@/components/admin/ExcelImport'
import { VehicleForm } from '@/components/admin/VehicleForm'
import { VehicleTable } from '@/components/admin/VehicleTable'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { localDb, type LocalVehicle } from '@/lib/localDb'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export interface Vehicle {
  id: number
  plate: string
  company: string
  projectId?: number | null
  contactName: string | null
  contactPhone: string | null
  accessType: 'PERMANENT' | 'TEMPORARY' | 'SINGLE_USE'
  expiresAt: string | null
  isExpired: boolean
  note: string | null
  source: string
  createdAt: string
}

function localToVehicle(v: LocalVehicle): Vehicle {
  return { ...v, source: 'local', createdAt: v.updatedAt }
}

const LIMIT = 50

type BulkAction = 'extend' | 'set_permanent' | 'set_project' | 'set_expired' | 'set_active' | 'delete'

const BULK_OPTIONS: { value: BulkAction; label: string }[] = [
  { value: 'extend',        label: '⏳ Продовжити термін' },
  { value: 'set_permanent', label: '♾️ Зробити постійними' },
  { value: 'set_project',   label: '📁 Призначити проект' },
  { value: 'set_active',    label: '🟢 Розблокувати' },
  { value: 'set_expired',   label: '🔴 Заблокувати' },
  { value: 'delete',        label: '🗑 Видалити' },
]

export default function VehiclesPage() {
  const isOnline = useOnlineStatus()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)
  const [isLocal, setIsLocal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkAction, setBulkAction] = useState<BulkAction | ''>('')
  const [showBulkModal, setShowBulkModal] = useState(false)

  const fetchFromLocal = useCallback(async () => {
    let query = localDb.vehicles.toCollection()
    if (filter === 'permanent') query = localDb.vehicles.where('accessType').equals('PERMANENT')
    if (filter === 'temporary') query = localDb.vehicles.where('accessType').equals('TEMPORARY')
    if (filter === 'single')    query = localDb.vehicles.where('accessType').equals('SINGLE_USE')
    let all = await query.toArray()
    if (filter === 'expired') all = all.filter(v => v.isExpired)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      all = all.filter(v => v.plate.toLowerCase().includes(q) || v.company.toLowerCase().includes(q))
    }
    const paged = all.slice((page - 1) * LIMIT, page * LIMIT)
    return { vehicles: paged.map(localToVehicle), total: all.length }
  }, [page, filter, search])

  const fetchFromApi = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page), limit: String(LIMIT),
      ...(filter && { filter }), ...(search && { search }),
    })
    const res = await fetch(`/api/vehicles?${params}`)
    return res.json() as Promise<{ vehicles: Vehicle[]; total: number }>
  }, [page, filter, search])

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    setSelectedIds(new Set())
    setBulkAction('')
    try {
      if (isOnline) {
        try {
          const data = await fetchFromApi()
          setVehicles(data.vehicles)
          setTotal(data.total)
          setIsLocal(false)
          return
        } catch { /* fallback */ }
      }
      const data = await fetchFromLocal()
      setVehicles(data.vehicles)
      setTotal(data.total)
      setIsLocal(true)
    } finally {
      setLoading(false)
    }
  }, [isOnline, fetchFromApi, fetchFromLocal])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити це авто?')) return
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
    fetchVehicles()
  }

  const handleApplyBulk = () => {
    if (!bulkAction || selectedIds.size === 0) return
    setShowBulkModal(true)
  }

  const handleBulkConfirm = async (payload: Record<string, unknown>) => {
    const ids = Array.from(selectedIds)
    const res = await fetch('/api/vehicles/batch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, ...payload }),
    })
    if (!res.ok) throw new Error('Помилка')
    setShowBulkModal(false)
    fetchVehicles()
  }

  const totalPages = Math.ceil(total / LIMIT)
  const allSelected = selectedIds.size === vehicles.length && vehicles.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Адмін</Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-xl font-bold text-gray-800">🚗 Автомобілі</h1>
            <span className="text-sm text-gray-500">({total})</span>
            {isLocal && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                📴 локальна база
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)}
              className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm hover:bg-green-100">
              📊 Імпорт Excel
            </button>
            <button onClick={() => { setEditVehicle(null); setShowForm(true) }}
              disabled={isLocal}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40">
              + Додати
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {isLocal && (
          <div className="mb-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl px-4 py-3 text-sm">
            📴 Відображається локальна копія бази. Редагування недоступне.
          </div>
        )}

        {/* WordPress-style toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Bulk actions — зліва як у WP */}
          {!isLocal && (
            <div className="flex items-center gap-2">
              <select
                value={bulkAction}
                onChange={e => setBulkAction(e.target.value as BulkAction | '')}
                disabled={selectedIds.size === 0}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
              >
                <option value="">Масові дії</option>
                {BULK_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={handleApplyBulk}
                disabled={!bulkAction || selectedIds.size === 0}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Застосувати
              </button>
              {selectedIds.size > 0 && (
                <span className="text-sm text-gray-500">
                  Обрано: <strong>{selectedIds.size}</strong>
                  <button onClick={() => setSelectedIds(new Set())}
                    className="ml-2 text-gray-400 hover:text-gray-600">✕</button>
                </span>
              )}
            </div>
          )}

          {/* Фільтри — справа */}
          <div className="flex gap-2 ml-auto flex-wrap">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Пошук..."
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
            <select
              value={filter}
              onChange={e => { setFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Всі</option>
              <option value="permanent">Постійні</option>
              <option value="temporary">Тимчасові</option>
              <option value="single">Разові</option>
              <option value="expired">Прострочені</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Завантаження...</div>
        ) : (
          <VehicleTable
            vehicles={vehicles}
            onEdit={v => { setEditVehicle(v); setShowForm(true) }}
            onDelete={handleDelete}
            readOnly={isLocal}
            selectedIds={isLocal ? undefined : selectedIds}
            onSelectionChange={isLocal ? undefined : setSelectedIds}
          />
        )}

        {/* Нижній toolbar — як у WP (дублюємо bulk actions) */}
        {!isLocal && vehicles.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <select
              value={bulkAction}
              onChange={e => setBulkAction(e.target.value as BulkAction | '')}
              disabled={selectedIds.size === 0}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none disabled:opacity-50 disabled:bg-gray-50"
            >
              <option value="">Масові дії</option>
              {BULK_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={handleApplyBulk}
              disabled={!bulkAction || selectedIds.size === 0}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              Застосувати
            </button>

            {/* Пагінація справа */}
            {total > LIMIT && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-500">
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} з {total}
                </span>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">←</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">→</button>
              </div>
            )}
          </div>
        )}

        {/* Верхня пагінація якщо багато записів */}
        {total > LIMIT && (
          <div className="flex justify-end mt-1 mb-4 text-sm text-gray-400">
            Сторінка {page} з {totalPages}
          </div>
        )}
      </main>

      {showForm && !isLocal && (
        <VehicleForm
          vehicle={editVehicle}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchVehicles() }}
        />
      )}
      {showImport && (
        <ExcelImport
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); fetchVehicles() }}
        />
      )}
      {showBulkModal && bulkAction && (
        <BulkActionsModal
          count={selectedIds.size}
          action={bulkAction}
          onClose={() => setShowBulkModal(false)}
          onConfirm={handleBulkConfirm}
        />
      )}
    </div>
  )
}