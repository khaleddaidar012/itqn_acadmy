import type { Metadata } from 'next'
import type { Locale } from '@/types'
import { getTranslations } from '@/locales'
import { RequestForm } from '@/components/forms/RequestForm'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ service?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const isArabic = locale === 'ar'
  return {
    title: isArabic ? 'اطلب خدمة' : 'Request a Service',
    description: isArabic
      ? 'أرسل لنا تفاصيل مشروعك وسنتواصل معك في أقرب وقت ممكن.'
      : 'Send us your project details and we\'ll get back to you as soon as possible.',
  }
}

export default async function RequestPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const { service } = await searchParams
  const t = getTranslations(locale)
  const preSelectedService = service || ''

  return (
    <div className="pt-24 pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <span className="inline-block text-sm font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-3">
              {locale === 'ar' ? 'ابدأ معنا' : 'Get Started'}
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              {t.request.pageTitle}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t.request.pageSubtitle}
            </p>
          </div>

          <RequestForm locale={locale} preSelectedService={preSelectedService} />
        </div>
      </div>
    </div>
  )
}
