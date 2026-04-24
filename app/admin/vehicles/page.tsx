'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { VehicleTable } from '@/components/admin/VehicleTable'
import { VehicleForm } from '@/components/admin/VehicleForm'
import { ExcelImport } from '@/components/admin/ExcelImport'
import { localDb, type LocalVehicle } from '@/lib/localDb'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export interface Vehicle {
  id: number
  plate: string
  company: string
  contactName: string | null
  contactPhone: string | null
  accessType: 'PERMANENT' | 'TEMPORARY'
  expiresAt: string | null
  isExpired: boolean
  note: string | null
  source: string
  createdAt: string
}

function localToVehicle(v: LocalVehicle): Vehicle {
  return {
    ...v,
    source: 'local',
    createdAt: v.updatedAt,
  }
}

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

  const LIMIT = 50

  const fetchFromLocal = useCallback(async () => {
    let query = localDb.vehicles.toCollection()

    // Фільтр по типу
    if (filter === 'permanent') query = localDb.vehicles.where('accessType').equals('PERMANENT')
    if (filter === 'temporary') query = localDb.vehicles.where('accessType').equals('TEMPORARY')
    if (filter === 'expired')   query = localDb.vehicles.where('isExpired').equals(1 as unknown as boolean)

    let all = await query.toArray()

    // Пошук
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      all = all.filter(v =>
        v.plate.toLowerCase().includes(q) || v.company.toLowerCase().includes(q)
      )
    }

    const total = all.length
    const paged = all.slice((page - 1) * LIMIT, page * LIMIT)
    return { vehicles: paged.map(localToVehicle), total }
  }, [page, filter, search])

  const fetchFromApi = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      ...(filter && { filter }),
      ...(search && { search }),
    })
    const res = await fetch(`/api/vehicles?${params}`)
    return res.json() as Promise<{ vehicles: Vehicle[]; total: number }>
  }, [page, filter, search])

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    try {
      if (isOnline) {
        try {
          const data = await fetchFromApi()
          setVehicles(data.vehicles)
          setTotal(data.total)
          setIsLocal(false)
          return
        } catch {
          // API недоступне — fallback на локальну
        }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">
              ← Адмін
            </Link>
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
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm hover:bg-green-100 transition-colors"
            >
              📊 Імпорт Excel
            </button>
            <button
              onClick={() => { setEditVehicle(null); setShowForm(true) }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              disabled={isLocal}
              title={isLocal ? 'Додавання доступне тільки онлайн' : ''}
            >
              + Додати
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Офлайн-банер */}
        {isLocal && (
          <div className="mb-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl px-4 py-3 text-sm">
            📴 Відображається локальна копія бази. Редагування недоступне до відновлення з'єднання.
          </div>
        )}

        {/* Фільтри */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Пошук за номером або компанією..."
            className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Всі</option>
            <option value="permanent">Постійні</option>
            <option value="temporary">Тимчасові</option>
            <option value="expired">Прострочені</option>
          </select>
        </div>

        {/* Таблиця */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Завантаження...</div>
        ) : (
          <VehicleTable
            vehicles={vehicles}
            onEdit={v => { setEditVehicle(v); setShowForm(true) }}
            onDelete={handleDelete}
            readOnly={isLocal}
          />
        )}

        {/* Пагінація */}
        {total > LIMIT && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              ← Назад
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              {page} / {Math.ceil(total / LIMIT)}
            </span>
            <button
              disabled={page >= Math.ceil(total / LIMIT)}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Далі →
            </button>
          </div>
        )}
      </main>

      {/* Форма додавання/редагування */}
      {showForm && !isLocal && (
        <VehicleForm
          vehicle={editVehicle}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchVehicles() }}
        />
      )}

      {/* Імпорт Excel */}
      {showImport && (
        <ExcelImport
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); fetchVehicles() }}
        />
      )}
    </div>
  )
}
