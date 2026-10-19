'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, Check, Clock, Users, Calendar, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { getTranslations } from '@/locales'
import { useRegion } from '@/components/providers/RegionProvider'
import { CheckoutModal } from '@/components/checkout/CheckoutModal'
import type { PricingPlan, ProgramCategory } from '@/data/pricing'
import type { Locale } from '@/types'

interface PricingSectionProps {
  locale: Locale
}

/** Returns true if the user hasn't asked to reduce motion */
function usePrefersMotion() {
  const [ok, setOk] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setOk(!mq.matches)
    const handler = (e: MediaQueryListEvent) => setOk(!e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return ok
}

export function PricingSection({ locale }: PricingSectionProps) {
  const t = getTranslations(locale)
  const { region, isLoaded, programs, error: regionError, retry } = useRegion()
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight
  const prefersMotion = usePrefersMotion()

  // ── Categories ────────────────────────────────────────────────────────────
  const categories: ProgramCategory[] = programs
  const [activeCategoryId, setActiveCategoryId] = useState<string>('')
  const currentCategory =
    categories.find((c) => c.id === activeCategoryId) || categories[0]

  // ── Duration — default to 30 minutes ─────────────────────────────────────
  const availableDurations = Array.from(
    new Set(currentCategory?.plans.map((p) => p.durationMinutes).filter((d): d is number => typeof d === 'number') || [])
  ).sort((a, b) => a - b)

  const getInitialDuration = useCallback(
    (durations: number[]): number | 'all' => {
      return durations.includes(30) ? 30 : durations[0] ?? 'all'
    },
    []
  )

  const [selectedDuration, setSelectedDuration] = useState<number | 'all'>(() =>
    getInitialDuration(availableDurations)
  )

  // Reset to 30 min default when category changes
  const prevCategoryId = useRef<string>('')
  useEffect(() => {
    if (currentCategory?.id && currentCategory.id !== prevCategoryId.current) {
      prevCategoryId.current = currentCategory.id
      const durations = Array.from(
        new Set(currentCategory.plans.map((p) => p.durationMinutes).filter((d): d is number => typeof d === 'number'))
      ).sort((a, b) => a - b)
      setSelectedDuration(getInitialDuration(durations))
      setHasInteracted(false) // restart hint animation on tab change
    }
  }, [currentCategory, getInitialDuration])

  // ── Hint animation state ──────────────────────────────────────────────────
  // hintIndex = index into availableDurations that is currently "glowing"
  const [hasInteracted, setHasInteracted] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const hintTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start / stop the touring highlight
  useEffect(() => {
    if (!prefersMotion || hasInteracted || availableDurations.length < 2) return

    // Cycle through all duration buttons every 1.6 s
    hintTimer.current = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % availableDurations.length)
    }, 1600)

    return () => {
      if (hintTimer.current) clearInterval(hintTimer.current)
    }
  }, [prefersMotion, hasInteracted, availableDurations.length])

  function handleDurationClick(dur: number | 'all') {
    setSelectedDuration(dur)
    setHasInteracted(true)
    if (hintTimer.current) clearInterval(hintTimer.current)
  }

  // ── Filtered plans ────────────────────────────────────────────────────────
  const filteredPlans = currentCategory?.plans.filter((plan) => {
    if (selectedDuration === 'all') return true
    return plan.durationMinutes === selectedDuration
  }) || []

  // ── Checkout modal ────────────────────────────────────────────────────────
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PricingPlan | null>(null)

  return (
    <section
      id="pricing"
      className="py-24 bg-gradient-to-b from-cream-100/60 via-white to-cream-50 dark:from-[#061d17] dark:via-[#08251e] dark:to-[#051712] relative overflow-hidden"
      aria-labelledby="pricing-heading"
    >
      {/* Subtle Islamic Motif */}
      <div className="absolute inset-0 islamic-pattern opacity-30 pointer-events-none" aria-hidden="true" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── Section Header ──────────────────────────────────────────────── */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-200 dark:bg-brand-900/60 border border-gold-400/30 text-xs font-bold text-brand-800 dark:text-gold-300">
            <Sparkles size={12} className="text-gold-500" />
            <span>{t.pricing.sectionLabel}</span>
          </div>

          <h2
            id="pricing-heading"
            className="text-2xl sm:text-4xl font-extrabold text-brand-900 dark:text-cream-100 tracking-tight"
          >
            {t.pricing.title}
          </h2>

          <div className="flex items-center justify-center gap-3 py-1 text-gold-500">
            <span className="w-12 h-px bg-gold-400/50" />
            <span className="text-lg">❖</span>
            <span className="w-12 h-px bg-gold-400/50" />
          </div>

          <p className="text-sm sm:text-base text-charcoal-800/80 dark:text-cream-200/80 max-w-xl mx-auto">
            {t.pricing.subtitle}
          </p>
        </div>

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {!isLoaded && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-brand-700 dark:text-gold-400">
            {!regionError && <Loader2 size={32} className="animate-spin" />}{regionError && <button type="button" onClick={retry} className="rounded-xl border px-4 py-2">{locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button>}
            <span className="text-sm font-medium">
              {regionError ? (locale === 'ar' ? 'تعذر تحديد بلد الاتصال. أعد المحاولة لعرض الأسعار المناسبة لك.' : 'Unable to determine your country. Retry to see your prices.') : (locale === 'ar' ? 'جارٍ تحديد بلدك لعرض الأسعار المناسبة...' : 'Detecting your country for accurate pricing...')}
            </span>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────────── */}
        {isLoaded && (
          <>
            {/* Category Tabs */}
            {categories.length > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
                {categories.map((cat) => {
                  const isActive = cat.id === (currentCategory?.id || '')
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveCategoryId(cat.id)
                      }}
                      className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all duration-200 ${
                        isActive
                          ? 'bg-brand-600 border-brand-600 text-white shadow-[0_4px_14px_rgba(7,91,74,0.25)]'
                          : 'bg-white dark:bg-brand-900/40 border-cream-300 dark:border-brand-800 text-charcoal-800 dark:text-cream-200 hover:border-gold-400'
                      }`}
                    >
                      {locale === 'ar' ? cat.titleAr : cat.titleEn}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Duration Pills with Hint Animation ───────────────────────── */}
            {availableDurations.length > 1 && (
              <div className="flex flex-col items-center gap-3 mb-12">
                {/* Label + hint text */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-charcoal-800/60 dark:text-cream-200/60 font-medium">
                    {t.pricing.durationLabel}
                  </span>
                  {!hasInteracted && prefersMotion && (
                    <span className="text-[10px] text-gold-500 dark:text-gold-400 font-semibold animate-pulse">
                      {locale === 'ar' ? '← اختر المدة' : 'Choose duration →'}
                    </span>
                  )}
                </div>

                {/* Pill buttons */}
                <div className="relative flex items-center gap-2 p-1.5 rounded-2xl bg-cream-100/80 dark:bg-brand-900/50 border border-cream-200 dark:border-brand-800/60 shadow-inner">
                  {availableDurations.map((dur, idx) => {
                    const isSelected = selectedDuration === dur
                    // Is this the currently "touring" hint button?
                    const isHinted = !hasInteracted && prefersMotion && hintIndex === idx

                    return (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => handleDurationClick(dur)}
                        aria-pressed={isSelected}
                        className={[
                          'relative px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300',
                          isSelected
                            ? 'bg-brand-600 text-white shadow-[0_3px_12px_rgba(7,91,74,0.30)] scale-105'
                            : 'text-charcoal-800 dark:text-cream-200 hover:bg-white/60 dark:hover:bg-brand-800/50',
                          // Hint ring — appears only on touring button, not selected
                          isHinted && !isSelected
                            ? 'ring-2 ring-gold-400/70 ring-offset-1 ring-offset-cream-100 dark:ring-offset-brand-900 bg-white/70 dark:bg-brand-800/40'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {/* Touring shimmer overlay */}
                        {isHinted && !isSelected && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 rounded-xl bg-gold-400/10 dark:bg-gold-300/10 animate-[ping_1.2s_ease-out_infinite]"
                          />
                        )}

                        <span className="relative z-10">
                          {dur} {t.pricing.minutesUnit}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Pricing Cards Grid ────────────────────────────────────────── */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
              {filteredPlans.map((plan) => {
                const showPopularBadge = false // Popular badge permanently hidden

                const currencyLabel =
                  plan.currency === 'EGP'
                    ? locale === 'ar' ? 'جنيه' : 'EGP'
                    : locale === 'ar' ? '$' : 'USD'

                return (
                  <div
                    key={plan.id}
                    className="rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 relative bg-white/90 dark:bg-[#08241e] border border-cream-300/80 dark:border-brand-800/80 shadow-[0_4px_18px_rgba(7,91,74,0.05)] hover:shadow-[0_8px_28px_rgba(7,91,74,0.12)] hover:-translate-y-1"
                  >
                    {/* Popular Badge */}
                    {showPopularBadge && (
                      <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                        <span className="px-4 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-sm flex items-center gap-1">
                          <Sparkles size={11} />
                          <span>{t.pricing.popularBadge}</span>
                        </span>
                      </div>
                    )}

                    <div className="space-y-6">
                      {/* Tier & Plan Name */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-cream-200 dark:bg-brand-900 text-gold-700 dark:text-gold-300">
                            {locale === 'ar' ? plan.tierAr : plan.tierEn}
                          </span>
                          <span className="text-xs font-semibold text-brand-700 dark:text-gold-400 flex items-center gap-1">
                            <Clock size={12} />
                            <span>{plan.durationMinutes ? `${plan.durationMinutes} ${t.pricing.minutesUnit}` : locale === 'ar' ? 'وقت حسب احتياج الطالب' : 'Timing tailored to the student'}</span>
                          </span>
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold text-brand-900 dark:text-cream-100 pt-1">
                          {locale === 'ar' ? plan.nameAr : plan.nameEn}
                        </h3>

                        {(plan.descriptionAr || plan.descriptionEn) && (
                          <p className="text-xs text-gold-600 dark:text-gold-400 font-medium">
                            {locale === 'ar' ? plan.descriptionAr : plan.descriptionEn}
                          </p>
                        )}
                      </div>

                      {plan.originalPrice && plan.originalPrice > plan.price && <div className="flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 dark:bg-brand-900 p-3"><span className="rounded-full bg-brand-700 text-white text-xs font-bold px-3 py-1">{locale === 'ar' ? 'خصم' : 'SAVE'} {Math.round((1 - plan.price / plan.originalPrice) * 100)}%</span><span className="text-sm text-charcoal-800/60 dark:text-cream-200/70"><span className="sr-only">{locale === 'ar' ? 'السعر الأصلي' : 'Original price'}</span><del>{plan.originalPrice} {currencyLabel}</del></span><span className="text-xs font-bold text-brand-800 dark:text-gold-300">{locale === 'ar' ? 'توفر' : 'You save'} {plan.originalPrice - plan.price} {currencyLabel}</span></div>}
                      {/* Price Banner */}
                      <div className="pt-2 pb-4 border-y border-cream-200 dark:border-brand-800/60 flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-brand-800 dark:text-gold-300">
                          {plan.price}
                        </span>
                        <span className="text-sm font-bold text-charcoal-800/80 dark:text-cream-200/80">
                          {currencyLabel}
                        </span>
                        <span className="text-xs text-charcoal-800/60 dark:text-cream-200/60 mr-1 ml-1">
                          / {plan.billingPeriod === 'package' ? (locale === 'ar' ? 'الباقة' : 'package') : t.pricing.perMonth}
                        </span>
                      </div>

                      {plan.siblingsOnly && <p className="text-xs font-semibold text-brand-800 dark:text-gold-300">{locale === 'ar' ? 'السعر للمجموعة كاملة • 8 حصص شهريًا للمجموعة • العرض للإخوة فقط' : 'Total group price • 8 group classes per month • Siblings only'}</p>}
                      {/* Key Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-charcoal-800 dark:text-cream-200 bg-cream-50 dark:bg-brand-900/40 p-3 rounded-xl border border-cream-200 dark:border-brand-800">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gold-600" />
                          <span>
                            {plan.sessionsPerMonth} {plan.billingPeriod === 'package' ? (locale === 'ar' ? 'حصص' : 'classes') : (locale === 'ar' ? 'حصص شهرياً' : 'classes/mo')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-brand-600 dark:text-gold-300" />
                          <span>
                            {plan.studentsCount === 1
                              ? t.pricing.studentSingle
                              : plan.studentsCount === 2
                              ? t.pricing.studentsTwo
                              : t.pricing.studentsThree}
                          </span>
                        </div>
                      </div>

                      {/* Features Checklist */}
                      <div className="space-y-2 pt-1">
                        {(locale === 'ar' ? plan.featuresAr : plan.featuresEn).map((feature) => (
                          <div key={feature} className="flex items-start gap-2.5 text-xs text-charcoal-800/90 dark:text-cream-200/90">
                            <div className="w-4 h-4 rounded-full bg-gold-100 dark:bg-brand-800 text-gold-700 dark:text-gold-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check size={10} strokeWidth={3} />
                            </div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="pt-6">
                      <button
                        type="button"
                        onClick={() => setSelectedPlanForCheckout(plan)}
                        className={`w-full py-3.5 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-sm ${
                          showPopularBadge
                            ? 'bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white shadow-md hover:-translate-y-0.5'
                            : 'bg-cream-100 hover:bg-brand-600 text-brand-800 hover:text-white dark:bg-brand-800/70 dark:text-cream-100 dark:hover:bg-brand-600 border border-gold-300/40'
                        }`}
                      >
                        <span>{t.pricing.selectBtn}</span>
                        <ArrowIcon size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

      </div>

      {/* Checkout Modal */}
      {selectedPlanForCheckout && (
        <CheckoutModal
          plan={selectedPlanForCheckout}
          programTitle={locale === 'ar' ? (currentCategory?.titleAr || '') : (currentCategory?.titleEn || '')}
          region={region}
          locale={locale}
          onClose={() => setSelectedPlanForCheckout(null)}
        />
      )}
    </section>
  )
}
