'use client'
import type { Vehicle } from '@/app/admin/vehicles/page'

interface Props {
  vehicles: Vehicle[]
  onEdit: (v: Vehicle) => void
  onDelete: (id: number) => void
}

export function VehicleTable({ vehicles, onEdit, onDelete }: Props) {
  if (vehicles.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
        <div className="text-4xl mb-3">🚗</div>
        <div>Жодного авто не знайдено</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold">Номер</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold">Компанія</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Тип</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden lg:table-cell">Дійсний до</th>
            <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Статус</th>
            <th className="text-right px-4 py-3 text-gray-600 font-semibold">Дії</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v, i) => {
            const isExpiredOrOverdue =
              v.isExpired ||
              (v.expiresAt && new Date(v.expiresAt) < new Date())

            return (
              <tr
                key={v.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  i % 2 === 0 ? '' : 'bg-gray-50/30'
                }`}
              >
                <td className="px-4 py-3 font-mono font-bold text-gray-900">
                  {v.plate}
                </td>
                <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">
                  {v.company}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    v.accessType === 'PERMANENT'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {v.accessType === 'PERMANENT' ? 'Постійний' : 'Тимчасовий'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                  {v.expiresAt
                    ? new Date(v.expiresAt).toLocaleDateString('uk-UA')
                    : '—'}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {isExpiredOrOverdue ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                      ⚠️ Прострочено
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      ✓ Активний
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => onEdit(v)}
                    className="text-blue-600 hover:text-blue-800 text-xs mr-3 font-medium"
                  >
                    Редагувати
                  </button>
                  <button
                    onClick={() => onDelete(v.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                  >
                    Видалити
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
