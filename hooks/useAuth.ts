'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface CurrentUser {
  id: number
  username: string
  role: string
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return { user, loading, logout }
}
