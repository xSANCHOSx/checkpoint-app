'use client'
import { useState, useEffect, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { searchLocal } from '@/lib/localDb'
import { getVehicleStatus, getDaysLeft, getDaysOverdue } from '@/lib/plateUtils'

export interface SearchResult {
  id: number
  plate: string
  company: string
  contactName: string | null
  contactPhone: string | null
  accessType: string
  expiresAt: string | null
  isExpired: boolean
  status: 'allowed' | 'expired' | 'denied'
  daysLeft: number | null
  daysOverdue: number | null
  note: string | null
}

export function useSearch() {
  const isOnline = useOnlineStatus()
  const [digits, setDigits] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)

      try {
        let raw: SearchResult[] = []

        if (isOnline) {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
          if (!res.ok) throw new Error('Search failed')
          raw = await res.json()
        } else {
          const local = await searchLocal(q)
          raw = local.map(v => ({
            ...v,
            status: getVehicleStatus(v),
            daysLeft: getDaysLeft(v.expiresAt),
            daysOverdue: getDaysOverdue(v.expiresAt),
          }))
        }

        setResults(raw)
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    },
    [isOnline]
  )

  useEffect(() => {
    const timer = setTimeout(() => search(digits), 300)
    return () => clearTimeout(timer)
  }, [digits, search])

  return { digits, setDigits, results, isLoading }
}
