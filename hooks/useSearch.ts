'use client'
import { useState, useEffect, useCallback } from 'react'
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
        // Завжди використовуємо локальну IndexedDB — швидко і не залежить від інтернету
        const local = await searchLocal(q)
        const raw: SearchResult[] = local.map(v => ({
          ...v,
          status: getVehicleStatus(v),
          daysLeft: getDaysLeft(v.expiresAt),
          daysOverdue: getDaysOverdue(v.expiresAt),
        }))

        setResults(raw)
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    const timer = setTimeout(() => search(digits), 300)
    return () => clearTimeout(timer)
  }, [digits, search])

  return { digits, setDigits, results, isLoading }
}
