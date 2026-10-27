import type { Metadata } from 'next'
import type { Locale } from '@/types'
import { SiteShell } from '@/components/layout/SiteShell'
import { LocaleAttributes } from '@/components/providers/LocaleAttributes'
import { notFound } from 'next/navigation'

export const dynamicParams = false

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateStaticParams() {
  return [{ locale: 'ar' }, { locale: 'en' }]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const isArabic = locale === 'ar'
  return {
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'ar': '/ar',
        'en': '/en',
      },
    },
    openGraph: {
      locale: isArabic ? 'ar_EG' : 'en_US',
      alternateLocale: isArabic ? 'en_US' : 'ar_EG',
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: rawLocale } = await params
  if (rawLocale !== 'ar' && rawLocale !== 'en') notFound()
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale

  return <><LocaleAttributes locale={locale} /><SiteShell locale={locale}>{children}</SiteShell></>
}
