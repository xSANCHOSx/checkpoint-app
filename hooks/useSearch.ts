'use client'
import { useState, useEffect, useCallback } from 'react'
import { searchLocal, searchEmergency } from '@/lib/localDb'
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
  isEmergency?: boolean
}

export function useSearch() {
  const [digits, setDigits] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setIsLoading(true)
    try {
      const [local, emergency] = await Promise.all([
        searchLocal(q),
        searchEmergency(q),
      ])

      const emergencyResults: SearchResult[] = emergency.map(e => ({
        id: e.id,
        plate: e.plate,
        company: '🚨 Аварійний список',
        contactName: null,
        contactPhone: null,
        accessType: 'PERMANENT',
        expiresAt: null,
        isExpired: false,
        status: 'allowed',
        daysLeft: null,
        daysOverdue: null,
        note: e.note,
        isEmergency: true,
      }))

      const emergencyPlates = new Set(emergency.map(e => e.plate))
      const regularResults: SearchResult[] = local
        .filter(v => !emergencyPlates.has(v.plate))
        .map(v => ({
          ...v,
          status: getVehicleStatus(v),
          daysLeft: getDaysLeft(v.expiresAt),
          daysOverdue: getDaysOverdue(v.expiresAt),
        }))

      setResults([...emergencyResults, ...regularResults])
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(digits), 300)
    return () => clearTimeout(timer)
  }, [digits, search])

  return { digits, setDigits, results, isLoading }
}
