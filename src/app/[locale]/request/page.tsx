import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { Locale } from '@/types'
import { getTranslations } from '@/locales'
import { RequestForm } from '@/components/forms/RequestForm'

type Props = {
  params: Promise<{ locale: string }>
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

export default async function RequestPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  return (
    <div className="pt-24 pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Navigation Link */}
          <div className="mb-6 flex items-center justify-start">
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0284c7] dark:hover:text-[#38bdf8] bg-white dark:bg-[#132038] hover:bg-slate-50 dark:hover:bg-[#172744] border border-slate-200 dark:border-slate-800/80 px-3.5 py-1.5 rounded-full transition-all duration-200 shadow-2xs group"
            >
              <BackArrow
                size={15}
                className="transition-transform duration-200 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 text-[#0284c7] dark:text-[#38bdf8]"
              />
              <span>{t.request.backToHome}</span>
            </Link>
          </div>

          {/* Page Header */}
          <div className="text-center mb-10">
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

          <RequestForm locale={locale} />
        </div>
      </div>
    </div>
  )
}
