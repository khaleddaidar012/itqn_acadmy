'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Region, Currency } from '@/data/pricing'

interface RegionContextType {
  region: Region
  currency: Currency
  isLoaded: boolean
  toggleRegion: () => void
}

const RegionContext = createContext<RegionContextType>({
  region: 'INTL',
  currency: 'USD',
  isLoaded: false,
  toggleRegion: () => {},
})

export function RegionProvider({ children }: { children: React.ReactNode }) {
  // Default to INTL until detection completes — prevents EGP flash for non-EG users
  const [region, setRegionState] = useState<Region>('INTL')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function detectCountry() {
      try {
        // ── Step 1: fast timezone heuristic ──────────────────────────────────
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
        const isEgyptTZ = timeZone.includes('Cairo') || timeZone.includes('Egypt')

        // ── Step 2: IP geo lookup (2-second timeout) ─────────────────────────
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 2000)

        let countryCode: string | null = null

        try {
          const res = await fetch('https://ipapi.co/json/', {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          })
          clearTimeout(timer)

          if (res.ok) {
            const data = await res.json()
            countryCode = data?.country_code ?? null
          }
        } catch {
          clearTimeout(timer)
        }

        if (isCancelled) return

        if (countryCode !== null) {
          // Geo-lookup succeeded — use authoritative result
          setRegionState(countryCode === 'EG' ? 'EG' : 'INTL')
        } else {
          // Geo-lookup failed — fall back to timezone heuristic; default INTL
          setRegionState(isEgyptTZ ? 'EG' : 'INTL')
        }
      } catch {
        // All detection failed — safe default: INTL
        if (!isCancelled) setRegionState('INTL')
      } finally {
        if (!isCancelled) setIsLoaded(true)
      }
    }

    detectCountry()
    return () => { isCancelled = true }
  }, [])

  const currency: Currency = region === 'EG' ? 'EGP' : 'USD'

  function toggleRegion() {
    setRegionState((prev) => (prev === 'EG' ? 'INTL' : 'EG'))
  }

  return (
    <RegionContext.Provider value={{ region, currency, isLoaded, toggleRegion }}>
      {children}
    </RegionContext.Provider>
  )
}

export function useRegion() {
  return useContext(RegionContext)
}
