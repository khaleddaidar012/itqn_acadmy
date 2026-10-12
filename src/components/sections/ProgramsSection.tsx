import Link from 'next/link'
import { BookMarked, Sparkles, BookOpenCheck, Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

interface ProgramsSectionProps {
  locale: Locale
}

export function ProgramsSection({ locale }: HeroSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  const iconMap: Record<string, React.ElementType> = {
    memorization: BookMarked,
    tajweed: Sparkles,
    recitation: BookOpenCheck,
  }

  return (
    <section
      id="programs"
      className="py-24 bg-cream-50 dark:bg-[#061c16] relative overflow-hidden"
      aria-labelledby="programs-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/60 border border-brand-200/60 dark:border-brand-700/50 text-xs font-bold text-brand-800 dark:text-gold-300">
            <span>✦</span>
            <span>{t.programs.sectionLabel}</span>
          </div>

          <h2
            id="programs-heading"
            className="text-2xl sm:text-4xl font-extrabold text-brand-900 dark:text-cream-100 tracking-tight"
          >
            {t.programs.title}
          </h2>

          <div className="flex items-center justify-center gap-3 py-1 text-gold-500">
            <span className="w-12 h-px bg-gold-400/50" />
            <span className="text-lg">❖</span>
            <span className="w-12 h-px bg-gold-400/50" />
          </div>

          <p className="text-sm sm:text-base text-charcoal-800/80 dark:text-cream-200/80 max-w-xl mx-auto">
            {t.programs.subtitle}
          </p>
        </div>

        {/* Programs Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {t.programs.items.map((item) => {
            const Icon = iconMap[item.id] || BookMarked
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-[#092b23] rounded-3xl border border-cream-300/80 dark:border-brand-800 p-7 sm:p-8 flex flex-col justify-between shadow-[0_4px_20px_rgba(7,91,74,0.06)] hover:shadow-[0_12px_36px_rgba(7,91,74,0.14)] hover:-translate-y-1.5 transition-all duration-300 relative group"
              >
                {/* Top highlight bar */}
                <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />

                <div className="space-y-6">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-800/80 border border-brand-100 dark:border-brand-700 flex items-center justify-center text-brand-700 dark:text-gold-300 shadow-sm transition-transform group-hover:scale-110">
                    <Icon size={28} />
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-brand-900 dark:text-cream-100">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-charcoal-800/70 dark:text-cream-200/75 leading-relaxed">
                      {item.shortDesc}
                    </p>
                  </div>

                  {/* Benefits */}
                  <div className="pt-2 space-y-2.5">
                    {item.benefits.map((benefit) => (
                      <div key={benefit} className="flex items-start gap-2.5 text-xs sm:text-sm text-charcoal-800 dark:text-cream-200">
                        <div className="w-4 h-4 rounded-full bg-gold-100 dark:bg-brand-800/90 text-gold-700 dark:text-gold-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={10} strokeWidth={3} />
                        </div>
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-8">
                  <Link
                    href={`/${locale}#pricing`}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-xs sm:text-sm text-brand-800 dark:text-cream-100 bg-cream-100 dark:bg-brand-800/70 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 dark:hover:text-white border border-gold-300/40 transition-all duration-200 shadow-sm"
                  >
                    <span>{item.cta}</span>
                    <ArrowIcon size={14} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
type HeroSectionProps = { locale: Locale }
