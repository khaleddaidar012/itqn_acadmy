import { Calendar, UserCheck, Award, BookOpen, Sparkles } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

interface WhyUsSectionProps {
  locale: Locale
}

export function WhyUsSection({ locale }: WhyUsSectionProps) {
  const t = getTranslations(locale)

  const iconMap: Record<string, React.ElementType> = {
    schedules: Calendar,
    personalized: UserCheck,
    teachers: Award,
    quranFocused: BookOpen,
  }

  return (
    <section
      id="why-us"
      className="py-24 bg-white dark:bg-[#07241e] relative overflow-hidden"
      aria-labelledby="why-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header with Ornamental Islamic Divider */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-200 dark:bg-brand-900/60 border border-gold-400/30 text-xs font-bold text-brand-800 dark:text-gold-300">
            <Sparkles size={12} className="text-gold-500" />
            <span>{t.whyUs.sectionLabel}</span>
          </div>

          <h2
            id="why-heading"
            className="text-2xl sm:text-4xl font-extrabold text-brand-900 dark:text-cream-100 tracking-tight"
          >
            {t.whyUs.title}
          </h2>

          <div className="flex items-center justify-center gap-3 py-1 text-gold-500">
            <span className="w-12 h-px bg-gold-400/50" />
            <span className="text-lg">❖</span>
            <span className="w-12 h-px bg-gold-400/50" />
          </div>

          <p className="text-sm sm:text-base text-charcoal-800/80 dark:text-cream-200/80 max-w-xl mx-auto">
            {t.whyUs.subtitle}
          </p>
        </div>

        {/* 4 Feature Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.whyUs.items.map((item) => {
            const Icon = iconMap[item.id] || Sparkles
            return (
              <div
                key={item.id}
                className="bg-cream-50/70 dark:bg-brand-900/40 rounded-2xl border border-gold-200/50 dark:border-brand-800/80 p-6 flex flex-col items-center text-center shadow-[0_4px_16px_rgba(7,91,74,0.04)] hover:shadow-[0_8px_28px_rgba(7,91,74,0.12)] hover:-translate-y-1 transition-all duration-300 group"
              >
                {/* Round Emblem Icon */}
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-brand-800 border border-gold-300/40 flex items-center justify-center text-brand-700 dark:text-gold-400 shadow-sm mb-5 group-hover:scale-110 transition-transform">
                  <Icon size={30} strokeWidth={2.2} />
                </div>

                <h3 className="font-bold text-base sm:text-lg text-brand-900 dark:text-cream-100 mb-2">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-charcoal-800/75 dark:text-cream-200/75 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
