'use client'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Region, Currency, ProgramCategory } from '@/data/pricing'
type Market = { region: Region; currency: Currency; country: string; locale: 'ar' | 'en'; programs: ProgramCategory[] }
interface RegionContextType { region: Region; currency: Currency; isLoaded: boolean; programs: ProgramCategory[]; error: boolean; retry: () => void }
const RegionContext = createContext<RegionContextType>({region:'INTL',currency:'USD',isLoaded:false,programs:[],error:false,retry:()=>{}})
export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [market,setMarket] = useState<Market>(); const [error,setError] = useState(false); const [attempt,setAttempt] = useState(0)
  const router = useRouter(); const pathname = usePathname()
  const retry = useCallback(() => setAttempt(n=>n+1), [])
  useEffect(() => {
    const controller = new AbortController(); const timeout = setTimeout(()=>controller.abort(),10000); let active=true
    setMarket(undefined); setError(false)
    fetch('/api/market',{cache:'no-store',signal:controller.signal}).then(async response => {
      if (!response.ok) throw new Error('Unavailable')
      const data: Market = await response.json()
      if (!['EG','INTL'].includes(data.region) || !Array.isArray(data.programs)) throw new Error('Invalid market')
      if (active) setMarket(data)
    }).catch(()=>{if(active) setError(true)}).finally(()=>clearTimeout(timeout))
    return ()=>{active=false;clearTimeout(timeout);controller.abort()}
  },[attempt])
  useEffect(()=>{
    if (!market) return
    const preference = document.cookie.split('; ').find(c=>c.startsWith('itqan_language='))?.split('=')[1]
    const language = preference === 'ar' || preference === 'en' ? preference : market.locale
    if (/^\/(ar|en)(\/|$)/.test(pathname) && pathname.split('/')[1] !== language) router.replace(pathname.replace(/^\/(ar|en)(?=\/|$)/, '/'+language)+window.location.search+window.location.hash)
  },[market,pathname,router])
  return <RegionContext.Provider value={{ region:market?.region || 'INTL', currency:market?.currency || 'USD', programs:market?.programs || [], isLoaded:!!market, error, retry }}>{children}</RegionContext.Provider>
}
export const useRegion = () => useContext(RegionContext)
