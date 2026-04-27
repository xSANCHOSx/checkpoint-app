'use client'
import type { Vehicle } from '@/app/admin/vehicles/page'

interface Props {
  vehicles: Vehicle[]
  onEdit: (v: Vehicle) => void
  onDelete: (id: number) => void
  readOnly?: boolean
  selectedIds?: Set<number>
  onSelectionChange?: (ids: Set<number>) => void
}

const ACCESS_TYPE_LABELS: Record<string, string> = {
  PERMANENT:   'Постійний',
  TEMPORARY:   'Тимчасовий',
  SINGLE_USE:  '1 раз',
}

const ACCESS_TYPE_COLORS: Record<string, string> = {
  PERMANENT:  'bg-blue-100 text-blue-700',
  TEMPORARY:  'bg-purple-100 text-purple-700',
  SINGLE_USE: 'bg-yellow-100 text-yellow-700',
}

export function VehicleTable({ vehicles, onEdit, onDelete, readOnly, selectedIds, onSelectionChange }: Props) {
  const selectable = !!onSelectionChange

  const toggleOne = (id: number) => {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    onSelectionChange(next)
  }

  const toggleAll = () => {
    if (!onSelectionChange || !selectedIds) return
    if (selectedIds.size === vehicles.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(vehicles.map(v => v.id)))
    }
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
        <div className="text-4xl mb-3">🚗</div>
        <div>Жодного авто не знайдено</div>
      </div>
    )
  }

  const allSelected = !!selectedIds && selectedIds.size === vehicles.length && vehicles.length > 0
  const someSelected = !!selectedIds && selectedIds.size > 0 && selectedIds.size < vehicles.length

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {selectable && (
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected }}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </th>
            )}
            <th className="text-left px-4 py-3 text-gray-600 font-semibold">Номер</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold">Компанія</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Проект</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Тип</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden lg:table-cell">Дійсний до</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Статус</th>
            <th className="text-right px-4 py-3 text-gray-600 font-semibold">Дії</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v, i) => {
            const isExpiredOrOverdue = v.isExpired || (v.expiresAt && new Date(v.expiresAt) < new Date())
            const isSelected = selectedIds?.has(v.id) ?? false
            const projectActive = v.project?.active ?? true

            return (
              <tr
                key={v.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50' : i % 2 === 0 ? '' : 'bg-gray-50/30'
                }`}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(v.id)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-mono font-bold text-gray-900" style={!projectActive ? {textDecoration: 'line-through', color: '#9ca3af'} : {}}>{v.plate}</td>
                <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate" style={!projectActive ? {textDecoration: 'line-through', color: '#9ca3af'} : {}}>{v.company}</td>

                {/* Проект: сірий якщо вимкнено, відсутній якщо не призначено */}
                <td className="px-4 py-3 hidden md:table-cell">
                  {v.project ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        projectActive
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                      title={projectActive ? 'Проект активний' : 'Проект вимкнено'}
                    >
                      {!projectActive && <span>⏸</span>}
                      📁 {v.project.name}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>

                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACCESS_TYPE_COLORS[v.accessType] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ACCESS_TYPE_LABELS[v.accessType] ?? v.accessType}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                  {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('uk-UA') : '—'}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {isExpiredOrOverdue ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">⚠️ Прострочено</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ Активний</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {!readOnly ? (
                    <>
                      <button onClick={() => onEdit(v)} className="text-blue-600 hover:text-blue-800 text-xs mr-3 font-medium">
                        Редагувати
                      </button>
                      <button onClick={() => onDelete(v.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                        Видалити
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-300">офлайн</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}