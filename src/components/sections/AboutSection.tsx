import { Award, BookOpen, HeartHandshake, Sparkles } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

interface AboutSectionProps {
  locale: Locale
}

export function AboutSection({ locale }: AboutSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'

  const icons = [Award, BookOpen, HeartHandshake]

  return (
    <section
      id="about"
      className="py-20 bg-white dark:bg-[#08221b] relative overflow-hidden"
      aria-labelledby="about-heading"
    >
      {/* Background accents */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-300 to-transparent opacity-60" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header with Ornamental Islamic Divider */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-200 dark:bg-brand-900/60 border border-gold-400/30 text-xs font-bold text-brand-800 dark:text-gold-300">
            <Sparkles size={12} className="text-gold-500" />
            <span>{t.about.sectionLabel}</span>
          </div>

          <h2
            id="about-heading"
            className="text-2xl sm:text-4xl font-extrabold text-brand-900 dark:text-cream-100 tracking-tight"
          >
            {t.about.title}
          </h2>

          {/* Elegant Gold Islamic Ornament / Divider */}
          <div className="flex items-center justify-center gap-3 py-1 text-gold-500">
            <span className="w-12 h-px bg-gold-400/50" />
            <span className="text-lg">❖</span>
            <span className="w-12 h-px bg-gold-400/50" />
          </div>

          <p className="text-sm sm:text-base font-semibold text-gold-600 dark:text-gold-400">
            {t.about.titleHighlight}
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          
          {/* Main narrative */}
          <div className="lg:col-span-7 space-y-6 text-charcoal-800/90 dark:text-cream-200/90 text-sm sm:text-base leading-relaxed">
            <div className="bg-cream-50 dark:bg-brand-900/30 border border-gold-300/30 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
              <p className="font-medium">
                {t.about.p1}
              </p>
              <p className="text-charcoal-800/80 dark:text-cream-200/80">
                {t.about.p2}
              </p>
              <div className="pt-3 border-t border-gold-200/50 dark:border-brand-800/60 flex items-center gap-2 text-xs sm:text-sm font-bold text-brand-700 dark:text-gold-300">
                <span>✦</span>
                <span>{t.about.slogan}</span>
              </div>
            </div>
          </div>

          {/* 3 Pillars Cards */}
          <div className="lg:col-span-5 space-y-4">
            {t.about.features.map((feature, idx) => {
              const IconComponent = icons[idx] || Award
              return (
                <div
                  key={feature.title}
                  className="bg-cream-100/60 dark:bg-brand-900/50 hover:bg-cream-100 dark:hover:bg-brand-900/80 border border-cream-300 dark:border-brand-800/80 rounded-2xl p-5 flex items-start gap-4 transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-gold-100 dark:bg-brand-800 flex items-center justify-center flex-shrink-0 text-gold-600 dark:text-gold-400">
                    <IconComponent size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-900 dark:text-cream-100 text-sm sm:text-base mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-charcoal-800/70 dark:text-cream-200/70 leading-normal">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

        </div>

      </div>
    </section>
  )
}
