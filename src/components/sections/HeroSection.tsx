import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, ArrowLeft, ArrowRight, BookOpen, Clock, Award, ShieldCheck } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

interface HeroSectionProps {
  locale: Locale
}

export function HeroSection({ locale }: HeroSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <section
      id="hero"
      className="relative min-h-[92vh] flex items-center overflow-hidden bg-gradient-to-b from-cream-100 via-cream-50 to-white dark:from-[#061e19] dark:via-[#082a23] dark:to-[#051814] pt-24 pb-16"
      aria-label={locale === 'ar' ? 'القسم الافتتاحي' : 'Hero section'}
    >
      {/* Subtle Islamic Motif Overlay */}
      <div className="absolute inset-0 islamic-pattern opacity-40 pointer-events-none" aria-hidden="true" />

      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-gold-400/10 dark:bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-24 w-96 h-96 bg-brand-500/10 dark:bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* ── Text Content ─────────────────────── */}
          <div className={`lg:col-span-7 space-y-7 ${isRTL ? 'text-right' : 'text-left'}`}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/60 border border-brand-200/80 dark:border-brand-700/50 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-brand-800 dark:text-gold-300">
                {t.hero.badge}
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.25] text-brand-900 dark:text-cream-100 tracking-tight">
                {t.hero.title}{' '}
                <span className="gold-gradient-text block sm:inline mt-1 sm:mt-0">
                  {t.hero.titleHighlight}
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-charcoal-800/80 dark:text-cream-200/90 leading-relaxed max-w-2xl">
              {t.hero.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href={`/${locale}#pricing`}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-sm sm:text-base text-white bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 hover:from-brand-700 hover:to-brand-900 shadow-[0_6px_22px_rgba(7,91,74,0.35)] hover:shadow-[0_8px_28px_rgba(7,91,74,0.45)] transition-all duration-300 hover:-translate-y-0.5"
                id="hero-enroll-cta"
              >
                <Sparkles size={18} className="text-gold-300" />
                <span>{t.hero.ctaPrimary}</span>
                <ArrowIcon size={18} />
              </Link>

              <Link
                href={`/${locale}#programs`}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm sm:text-base text-brand-800 dark:text-cream-100 bg-white/90 dark:bg-brand-900/40 border border-gold-400/50 hover:bg-gold-50 dark:hover:bg-brand-800/60 shadow-sm transition-all duration-200"
                id="hero-explore-cta"
              >
                <span>{t.hero.ctaSecondary}</span>
              </Link>
            </div>

            {/* Trust Highlights Strip */}
            <div className="pt-6 border-t border-brand-100/80 dark:border-brand-800/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gold-100 dark:bg-brand-800/60 flex items-center justify-center flex-shrink-0 text-gold-600 dark:text-gold-400">
                  <Award size={16} />
                </div>
                <span className="text-xs font-semibold text-charcoal-800 dark:text-cream-200">
                  {t.hero.stats.teachers}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-800/60 flex items-center justify-center flex-shrink-0 text-brand-700 dark:text-brand-300">
                  <Clock size={16} />
                </div>
                <span className="text-xs font-semibold text-charcoal-800 dark:text-cream-200">
                  {t.hero.stats.flexibility}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-cream-300/80 dark:bg-brand-800/60 flex items-center justify-center flex-shrink-0 text-brand-800 dark:text-gold-300">
                  <BookOpen size={16} />
                </div>
                <span className="text-xs font-semibold text-charcoal-800 dark:text-cream-200">
                  {t.hero.stats.individual}
                </span>
              </div>
            </div>

          </div>

          {/* ── Visual Brand Emblem ─────────────────── */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-72 sm:w-96 aspect-square rounded-3xl bg-gradient-to-br from-white via-cream-100 to-gold-50 dark:from-brand-900/90 dark:via-[#092e26] dark:to-[#061e19] p-7 shadow-[0_16px_50px_rgba(7,91,74,0.15)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.4)] border border-gold-300/40 flex flex-col items-center justify-center text-center group">
              
              {/* Decorative Corner Ornaments */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-gold-500 rounded-tl-sm pointer-events-none" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-gold-500 rounded-tr-sm pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-gold-500 rounded-bl-sm pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-gold-500 rounded-br-sm pointer-events-none" />

              {/* Logo Emblem */}
              <div className="relative w-44 h-44 sm:w-56 sm:h-56 mb-4 transition-transform duration-500 group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="شعار أكاديمية إتقان للقرآن الكريم"
                  fill
                  sizes="240px"
                  className="object-contain"
                  priority
                />
              </div>

              {/* Quranic Verse / Slogan Motto */}
              <div className="space-y-1">
                <p className="font-bold text-sm sm:text-base text-brand-900 dark:text-cream-100">
                  {locale === 'ar' ? 'أكاديمية إتقان للقرآن الكريم' : 'ITQAN Quran Academy'}
                </p>
                <p className="text-xs font-semibold text-gold-600 dark:text-gold-400">
                  {locale === 'ar' ? 'خطوات صغيرة.. أثر كبير' : 'Small Steps, Big Progress'}
                </p>
              </div>

              {/* Subtle Floating Badge */}
              <div className="absolute -bottom-4 bg-white dark:bg-brand-900 px-4 py-1.5 rounded-full shadow-lg border border-gold-400/40 text-xs font-bold text-brand-800 dark:text-cream-100 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-gold-500" />
                <span>{locale === 'ar' ? 'باقة من المعلمين والمعلمات لتحفيظ وتعليم القرآن الكريم' : 'A team of teachers for Quran Teaching & Memorization'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
