import type { Metadata } from 'next'
import type { Locale } from '@/types'
import { getTranslations } from '@/locales'
import { getPublishedProjects } from '@/data/projects'
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const isArabic = locale === 'ar'
  return {
    title: isArabic ? 'أعمالنا' : 'Portfolio',
    description: isArabic
      ? 'استعرض مشاريع دعيدر للحلول البرمجية — مواقع، متاجر، وأنظمة مخصصة.'
      : 'Browse Daidar Solutions portfolio — websites, e-commerce, and custom systems.',
  }
}

export default async function PortfolioPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const t = getTranslations(locale)
  const projects = getPublishedProjects()

  return (
    <div className="pt-24 pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-3">
            {t.portfolio.sectionLabel}
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t.portfolio_page.pageTitle}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t.portfolio_page.pageSubtitle}
          </p>
        </div>

        <PortfolioGrid locale={locale} projects={projects} />
      </div>
    </div>
  )
}
