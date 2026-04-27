'use client'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface Props {
  /** Breadcrumb label shown after "← Адмін |" — omit on the main admin page */
  title?: string
  /** Extra JSX rendered to the right of the title (filters, buttons, etc.) */
  actions?: React.ReactNode
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN:    { label: 'Адмін',    color: 'bg-purple-100 text-purple-700' },
  OPERATOR: { label: 'Оператор', color: 'bg-blue-100 text-blue-700' },
}

export function AdminHeader({ title, actions }: Props) {
  const { user, logout } = useAuth()

  const roleInfo = user ? (ROLE_LABELS[user.role] ?? { label: user.role, color: 'bg-gray-100 text-gray-600' }) : null

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between max-w-6xl mx-auto gap-3">

        {/* Left: breadcrumb + title */}
        <div className="flex items-center gap-3 min-w-0">
          {title ? (
            <>
              <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm shrink-0">
                ← Адмін
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-xl font-bold text-gray-800 truncate">{title}</h1>
            </>
          ) : (
            <>
              <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm shrink-0">
                ← КПП
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-xl font-bold text-gray-800">⚙️ Адміністратор</h1>
            </>
          )}
          {actions && <div className="flex items-center gap-2 ml-2">{actions}</div>}
        </div>

        {/* Right: user info + logout */}
        {user && (
          <div className="flex items-center gap-3 shrink-0">
            {/* User badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 hidden sm:block font-medium">
                {user.username}
              </span>
              {roleInfo && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              )}
            </div>

            {/* Users link — admin only */}
            {user.role === 'ADMIN' && (
              <Link
                href="/admin/users"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Управління користувачами"
              >
                👥 Користувачі
              </Link>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              title="Вийти"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
              <span className="hidden sm:block">Вийти</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}