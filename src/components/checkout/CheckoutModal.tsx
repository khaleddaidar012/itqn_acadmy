'use client'

import React, { useState, useEffect } from 'react'
import { X, Copy, Check, Clock, MessageSquare, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react'
import { getTranslations } from '@/locales'
import { ACADEMY_CONTACT, PAYMENT_METHODS } from '@/data/pricing'
import type { PricingPlan, Region } from '@/data/pricing'
import type { Locale } from '@/types'
import PaymobCheckout from './PaymobCheckout'

interface CheckoutModalProps {
  plan: PricingPlan | null
  programTitle: string
  region: Region
  locale: Locale
  onClose: () => void
}

const TIMER_STORAGE_KEY = 'itqan_payment_timer_start'
const TIMER_PLAN_KEY = 'itqan_payment_timer_plan_id'
const DURATION_SECONDS = 10

export function CheckoutModal({
  plan,
  programTitle,
  region,
  locale,
  onClose,
}: CheckoutModalProps) {
  const [quote, setQuote] = useState<PricingPlan | null>(null)
  const [quoteError, setQuoteError] = useState(false)
  useEffect(() => {
    setQuote(null); setQuoteError(false)
    if (!plan) return
    const controller = new AbortController(); let active=true
    fetch('/api/market', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({plan_id:plan.id}), cache:'no-store', signal:controller.signal }).then(async response=>{
      if (!response.ok) throw new Error('Unavailable')
      const data = await response.json()
      if (data.region !== region || data.plan.id !== plan.id || data.plan.price !== plan.price || data.plan.currency !== plan.currency) throw new Error('Market changed')
      if(active) setQuote(data.plan)
    }).catch(()=>{if(active) setQuoteError(true)})
    return ()=>{active=false;controller.abort()}
  },[plan,region])
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'

  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [timerActive, setTimerActive] = useState<boolean>(false)
  const [secondsLeft, setSecondsLeft] = useState<number>(DURATION_SECONDS)

  const methods = PAYMENT_METHODS[region] || PAYMENT_METHODS.EG

  // Set initial payment method
  useEffect(() => {
    if (methods.length > 0 && !selectedMethod) {
      setSelectedMethod(methods[0].id)
    }
  }, [methods, selectedMethod])

  // Check persisted timer on mount
  useEffect(() => {
    if (!plan) return

    try {
      const storedPlan = localStorage.getItem(TIMER_PLAN_KEY)
      const storedTime = localStorage.getItem(TIMER_STORAGE_KEY)

      if (storedPlan === plan.id && storedTime) {
        const elapsed = Math.floor((Date.now() - parseInt(storedTime, 10)) / 1000)
        if (elapsed < DURATION_SECONDS) {
          setSecondsLeft(DURATION_SECONDS - elapsed)
          setTimerActive(true)
        } else {
          setSecondsLeft(0)
          setTimerActive(true)
        }
      }
    } catch {}
  }, [plan])

  // Countdown Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (timerActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerActive, secondsLeft])

  if (!plan) return null
  if (!quote || quote.id !== plan.id) return <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"><div className="bg-white dark:bg-brand-900 rounded-2xl p-8 max-w-md text-center"><p>{quoteError ? (locale === 'ar' ? 'تعذر تأكيد الباقة لبلد اتصالك. أغلق النافذة وحدّث الأسعار ثم حاول مرة أخرى.' : 'Unable to verify this package for your country. Close and refresh pricing.') : (locale === 'ar' ? 'جارٍ تأكيد السعر والعملة لبلدك…' : 'Verifying your price and currency…')}</p><button onClick={onClose} className="mt-5 rounded-lg border px-4 py-2">{locale === 'ar' ? 'إغلاق' : 'Close'}</button></div></div>

  if (region === 'INTL') return <PaymobCheckout key={plan.id} plan={quote} locale={locale} onClose={onClose} />

  function handleStartTimer() {
    setTimerActive(true)
    setSecondsLeft(DURATION_SECONDS)
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, Date.now().toString())
      localStorage.setItem(TIMER_PLAN_KEY, plan!.id)
    } catch {}
  }

  function handleCancelAndBack() {
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY)
      localStorage.removeItem(TIMER_PLAN_KEY)
    } catch {}
    setTimerActive(false)
    setSecondsLeft(DURATION_SECONDS)
    onClose()
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const activeMethodConfig = methods.find((m) => m.id === selectedMethod) || methods[0]

  function handleSendWhatsApp() {
    const isArabic = locale === 'ar'
    const programName = isArabic ? programTitle : programTitle
    const packageName = (isArabic ? plan!.nameAr : plan!.nameEn) + (plan!.siblingsOnly ? (isArabic ? ' — للإخوة فقط، السعر للمجموعة كاملة' : ' — siblings only, total group price') : '')
    const students = plan!.studentsCount
    const duration = plan!.durationMinutes ? `${plan!.durationMinutes} ${isArabic ? 'دقيقة' : 'mins'}` : (isArabic ? 'حسب احتياج الطالب — بالتنسيق مع الأكاديمية' : 'Tailored to the student — arranged with the academy')
    const sessions = `${plan!.sessionsPerMonth} ${plan!.siblingsOnly ? (isArabic ? 'حصص شهريًا للمجموعة' : 'monthly group classes') : plan!.billingPeriod === 'package' ? (isArabic ? 'حصص في الباقة' : 'classes per package') : (isArabic ? 'حصص شهرياً' : 'monthly classes')}`
    const amount = `${plan!.price}`
    const currency = isArabic ? (plan!.currency === 'EGP' ? 'جنيه مصري' : 'دولار أمريكي') : plan!.currency
    const methodName = isArabic ? activeMethodConfig.nameAr : activeMethodConfig.nameEn

    let message = ''

    if (isArabic) {
      message = `السلام عليكم ورحمة الله وبركاته
أرغب في تأكيد طلب الاشتراك في أكاديمية إتقان.
البرنامج: ${programName}
الباقة: ${packageName}
عدد الطلاب: ${students}
مدة الحصة: ${duration}
عدد الحصص: ${sessions}
المبلغ: ${amount} ${currency}
طريقة التحويل: ${methodName}
قمت بإجراء التحويل، وأرجو مراجعة عملية الدفع والتواصل معي لتأكيد الاشتراك.
جزاكم الله خيرًا.`
    } else {
      message = `Assalamu Alaikum,
I would like to confirm my subscription request with ITQAN Quran Academy.
Program: ${programName}
Package: ${packageName}
Number of Students: ${students}
Session Duration: ${duration}
Sessions: ${sessions}
Amount: ${amount} ${currency}
Payment Method: ${methodName}
I have initiated the payment. Please review and confirm the payment and contact me to complete enrollment.
Thank you.`
    }

    const whatsappUrl = `https://wa.me/${ACADEMY_CONTACT.whatsappRaw}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#08241e] rounded-3xl shadow-2xl border border-gold-300/40 p-6 sm:p-8 my-8 text-charcoal-800 dark:text-cream-100 animate-fade-in">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 p-2 rounded-full hover:bg-cream-200 dark:hover:bg-brand-900/60 text-charcoal-800 dark:text-cream-200 transition-colors"
          aria-label={t.checkout.cancel}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="mb-6 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-100 dark:bg-brand-900/60 text-gold-700 dark:text-gold-300 text-xs font-bold">
            <Sparkles size={12} />
            <span>{locale === 'ar' ? plan.tierAr : plan.tierEn}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-brand-900 dark:text-cream-100">
            {t.checkout.modalTitle}
          </h3>
        </div>

        {/* ── Step 1: Order Summary ──────────────── */}
        <div className="bg-cream-50 dark:bg-brand-900/40 rounded-2xl p-5 border border-gold-200/50 dark:border-brand-800/80 mb-6 space-y-3">
          <h4 className="text-xs font-bold text-gold-700 dark:text-gold-400 uppercase tracking-wider">
            {t.checkout.step1Title}
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
            <div>
              <span className="text-charcoal-800/60 dark:text-cream-200/60 block">{t.checkout.program}</span>
              <span className="font-bold text-brand-900 dark:text-cream-100">{programTitle}</span>
            </div>
            <div>
              <span className="text-charcoal-800/60 dark:text-cream-200/60 block">{t.checkout.packageName}</span>
              <span className="font-bold text-brand-900 dark:text-cream-100">
                {locale === 'ar' ? plan.nameAr : plan.nameEn}
                {plan.siblingsOnly && <small className="block mt-1 text-brand-700 dark:text-gold-300">{locale === 'ar' ? 'للإخوة فقط — السعر للمجموعة كاملة' : 'Siblings only — total group price'}</small>}
              </span>
            </div>
            <div>
              <span className="text-charcoal-800/60 dark:text-cream-200/60 block">{t.checkout.duration}</span>
              <span className="font-bold text-brand-900 dark:text-cream-100">
                {plan.durationMinutes ? `${plan.durationMinutes} ${t.pricing.minutesUnit}` : locale === 'ar' ? 'حسب احتياج الطالب' : 'Tailored to the student'}
              </span>
            </div>
            <div>
              <span className="text-charcoal-800/60 dark:text-cream-200/60 block">{t.checkout.sessions}</span>
              <span className="font-bold text-brand-900 dark:text-cream-100">
                {plan.sessionsPerMonth} {locale === 'ar' ? 'حصص' : 'classes'}
              </span>
            </div>
            <div>
              <span className="text-charcoal-800/60 dark:text-cream-200/60 block">{t.checkout.students}</span>
              <span className="font-bold text-brand-900 dark:text-cream-100">
                {plan.studentsCount} {locale === 'ar' ? 'طالب' : 'learner(s)'}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white dark:bg-brand-800/60 p-2.5 rounded-xl border border-gold-300/40">
              <span className="text-charcoal-800/60 dark:text-cream-200/60 block text-[11px] font-medium">{t.checkout.totalDue}</span>
              <span className="text-base sm:text-lg font-black text-brand-700 dark:text-gold-300">
                {plan.price} {locale === 'ar' ? (plan.currency === 'EGP' ? 'ج.م' : '$') : plan.currency}
              </span>
            </div>
          </div>
        </div>

        {/* ── Step 2: Payment Details ─────────────── */}
        <div className="space-y-4 mb-6">
          <h4 className="text-xs font-bold text-gold-700 dark:text-gold-400 uppercase tracking-wider">
            {t.checkout.step2Title}
          </h4>

          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-2 gap-3">
            {methods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethod(method.id)}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all text-center ${
                  selectedMethod === method.id
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-800/80 text-brand-900 dark:text-cream-100 shadow-sm'
                    : 'border-cream-300 dark:border-brand-800 text-charcoal-800/70 dark:text-cream-200/70 hover:bg-cream-100 dark:hover:bg-brand-900/40'
                }`}
              >
                {locale === 'ar' ? method.nameAr : method.nameEn}
              </button>
            ))}
          </div>

          {/* Active Payment Method Instructions Box */}
          <div className="p-4 rounded-2xl bg-cream-100/70 dark:bg-brand-900/60 border border-gold-300/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-800 dark:text-gold-300">
                {locale === 'ar' ? activeMethodConfig.nameAr : activeMethodConfig.nameEn}
              </span>
              <span className="text-xs text-charcoal-800/70 dark:text-cream-200/70">
                {locale === 'ar' ? activeMethodConfig.details.notesAr : activeMethodConfig.details.notesEn}
              </span>
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-brand-800/80 p-3 rounded-xl border border-cream-200 dark:border-brand-700 gap-2">
              <span className="font-mono font-bold text-sm sm:text-base text-brand-900 dark:text-cream-100 select-all" dir="ltr">
                {activeMethodConfig.details.accountOrNumber}
              </span>

              <button
                type="button"
                onClick={() => handleCopy(activeMethodConfig.details.accountOrNumber, activeMethodConfig.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white transition-colors"
              >
                {copiedId === activeMethodConfig.id ? (
                  <>
                    <Check size={14} />
                    <span>{t.checkout.copiedMsg}</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>{t.checkout.copyBtn}</span>
                  </>
                )}
              </button>
            </div>

            {/* Crucial Note about Screenshot */}
            <div className="flex items-start gap-2 pt-1 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{t.checkout.importantNote}</span>
            </div>
          </div>
        </div>

        {/* ── Ten-Second Confirmation Timer Flow ──── */}
        {!timerActive ? (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartTimer}
              className="w-full py-4 rounded-2xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 hover:from-brand-700 hover:to-brand-900 shadow-[0_6px_22px_rgba(7,91,74,0.35)] transition-all duration-300 hover:-translate-y-0.5"
            >
              {t.checkout.initiateTransferBtn}
            </button>
          </div>
        ) : (
          <div className="pt-2 space-y-4">
            <div className="p-4 rounded-2xl bg-gold-50 dark:bg-brand-900/60 border border-gold-300/60 space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-gold-700 dark:text-gold-300 font-bold text-sm">
                <Clock size={18} className="animate-pulse" />
                <span>{t.checkout.timerTitle}</span>
              </div>
              <p className="text-xs text-charcoal-800/80 dark:text-cream-200/80 max-w-md mx-auto leading-relaxed">
                {t.checkout.timerDesc}
              </p>

              {secondsLeft > 0 ? (
                <div className="py-2">
                  <span className="text-xs text-charcoal-800/70 dark:text-cream-200/70 block mb-1">
                    {t.checkout.remainingTime}
                  </span>
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-brand-800 dark:text-gold-300 tracking-wider">
                    {formattedTime}
                  </span>
                </div>
              ) : (
                <div className="py-2 text-xs font-bold text-brand-700 dark:text-gold-300 flex items-center justify-center gap-1.5">
                  <Check size={16} />
                  <span>{locale === 'ar' ? 'اكتمل وقت التحويل! يمكنك الآن التأكيد عبر واتساب.' : 'Transfer time elapsed! You can now confirm on WhatsApp.'}</span>
                </div>
              )}
            </div>

            {/* "تم التحويل" Button — strictly enabled after 10s */}
            <button
              type="button"
              disabled={secondsLeft > 0}
              onClick={handleSendWhatsApp}
              className={`w-full py-4 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-300 ${
                secondsLeft > 0
                  ? 'bg-gray-200 dark:bg-brand-900/30 text-gray-400 dark:text-cream-200/40 cursor-not-allowed border border-gray-300 dark:border-brand-800'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_6px_22px_rgba(5,150,105,0.4)] hover:-translate-y-0.5 cursor-pointer animate-pulse-subtle'
              }`}
            >
              <MessageSquare size={18} />
              <span>
                {secondsLeft > 0
                  ? `${t.checkout.btnWaiting} (${formattedTime})`
                  : t.checkout.btnConfirmed}
              </span>
            </button>
          </div>
        )}

        {/* Back and Cancel Order Button */}
        <div className="pt-4 border-t border-cream-200 dark:border-brand-800/60 mt-5">
          <button
            type="button"
            onClick={handleCancelAndBack}
            className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-charcoal-800/80 dark:text-cream-200/80 bg-cream-100 hover:bg-cream-200 dark:bg-brand-900/40 dark:hover:bg-brand-900/80 border border-cream-300/80 dark:border-brand-800 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} className={isRTL ? 'rotate-180' : ''} />
            <span>{locale === 'ar' ? 'رجوع وإلغاء الطلب' : 'Back & Cancel Order'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}
