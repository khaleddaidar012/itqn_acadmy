'use client'
import { usePathname } from 'next/navigation'
import type { Locale } from '@/types'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { RegionProvider } from '@/components/providers/RegionProvider'

export function SiteShell({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const pathname = usePathname()
  if (/^\/(ar|en)\/(?:dashboard|payment-result)(?:\/|$)/.test(pathname)) return <div id="main-content">{children}</div>
  return <RegionProvider><div className="relative min-h-screen flex flex-col w-full max-w-full overflow-x-hidden"><Navbar locale={locale} /><main id="main-content" className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main><Footer locale={locale} /><WhatsAppButton locale={locale} /></div></RegionProvider>
}
