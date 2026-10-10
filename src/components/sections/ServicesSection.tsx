'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Globe,
  ShoppingBag,
  Settings2,
  Cloud,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'
import clsx from 'clsx'

interface ServicesSectionProps {
  locale: Locale
}

const iconMap: Record<string, React.ElementType> = {
  Globe,
  ShoppingBag,
  Settings2,
  Cloud,
}

const accentMap: Record<string, { bg: string; icon: string; border: string; badge: string }> = {
  website: {
    bg: '#eff8ff',
    icon: '#0284c7',
    border: '#bfe3fd',
    badge: 'bg-[#eff8ff] text-[#0284c7] border-[#bfe3fd]',
  },
  ecommerce: {
    bg: '#f5f3ff',
    icon: '#8b5cf6',
    border: '#ddd6fe',
    badge: 'bg-[#f5f3ff] text-[#7c3aed] border-[#ddd6fe]',
  },
  system: {
    bg: '#fff7ed',
    icon: '#f97316',
    border: '#fed7aa',
    badge: 'bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]',
  },
  saas: {
    bg: '#f0fdf4',
    icon: '#10b981',
    border: '#bbf7d0',
    badge: 'bg-[#f0fdf4] text-[#059669] border-[#bbf7d0]',
  },
}

function ServiceCard({
  service,
  locale,
  isRTL,
}: {
  service: (typeof import('@/locales/ar').default.services.items)[number]
  locale: Locale
  isRTL: boolean
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const Icon = iconMap[service.icon]
  const accent = accentMap[service.id] || accentMap.website
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight
  const t = getTranslations(locale)

  const handleMouseEnter = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setIsFlipped(true)
    }
  }

  const handleMouseLeave = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setIsFlipped(false)
    }
  }

  return (
    <div
      className={clsx(
        'flip-card group h-[400px] w-full cursor-pointer',
        isFlipped && 'is-flipped'
      )}
      onClick={() => {
        if (!isFlipped) setIsFlipped(true)
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setIsFlipped(true)}
      onBlur={() => setIsFlipped(false)}
    >
      <div className={clsx('flip-card-inner h-full', isFlipped && 'is-flipped')}>
        {/* Front Side */}
        <div
          className="flip-card-front rounded-2xl p-6 flex flex-col justify-between
                     bg-white dark:bg-[#132038]
                     border border-[#e2e8f0] dark:border-[#1e3456]
                     shadow-[0_2px_12px_rgba(15,39,68,0.06)]
                     hover:shadow-[0_8px_28px_rgba(56,189,248,0.12)]
                     transition-shadow duration-300"
        >
          <div>
            {/* Service Icon */}
            <div
              className="w-13 h-13 w-[52px] h-[52px] rounded-2xl flex items-center justify-center mb-5 flex-shrink-0"
              style={{
                backgroundColor: accent.bg,
                border: `1px solid ${accent.border}`,
              }}
            >
              <Icon size={24} color={accent.icon} />
            </div>

            {/* Title & Short Description */}
            <h3 className="text-lg font-bold text-[#0f2744] dark:text-[#e8f0fb] mb-2">
              {service.title}
            </h3>
            <p className="text-sm text-[#4a6080] dark:text-[#94b4d4] leading-relaxed">
              {service.frontDesc}
            </p>
          </div>

          {/* Flip Hint */}
          <div className="pt-4 border-t border-[#f1f5f9] dark:border-[#1a2d48] flex items-center justify-between text-xs text-[#8fa3bb]">
            <span className="flex items-center gap-1.5 font-medium text-[#0284c7] dark:text-[#38bdf8]">
              <RefreshCw size={13} className="animate-spin-slow" />
              {t.services.flipHint}
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0284c7]/10 dark:bg-[#38bdf8]/15 text-[#0284c7] dark:text-[#38bdf8] font-semibold">
              {locale === 'ar' ? 'تفاصيل' : 'Details'}
            </span>
          </div>
        </div>

        {/* Back Side */}
        <div
          className="flip-card-back rounded-2xl p-6 flex flex-col justify-between
                     bg-white dark:bg-[#0f1d33]
                     border-2 border-[#0284c7]/25 dark:border-[#38bdf8]/50
                     shadow-[0_4px_20px_rgba(2,132,199,0.12)] cursor-default"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <div className="overflow-hidden flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-base font-bold text-[#122840] dark:text-[#e8f0fb]">
                {service.whyTitle}
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsFlipped(false)
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-[#0284c7] dark:text-[#38bdf8] bg-[#0284c7]/10 dark:bg-[#38bdf8]/15 hover:bg-[#0284c7]/20 active:scale-95 px-2.5 py-1 rounded-full transition-all flex-shrink-0"
                aria-label={locale === 'ar' ? 'العودة' : 'Back'}
              >
                <RotateCcw size={12} />
                <span>{locale === 'ar' ? 'عودة' : 'Back'}</span>
              </button>
            </div>

            <p className="text-xs text-[#475a72] dark:text-[#94b4d4] mb-3 leading-relaxed line-clamp-2">
              {service.whyDesc}
            </p>

            {/* Benefits List */}
            <ul className="space-y-1.5 flex-1">
              {service.benefits.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 text-xs font-medium text-[#1e293b] dark:text-[#cbd5e1]"
                >
                  <CheckCircle
                    size={14}
                    className="text-[#0284c7] dark:text-[#38bdf8] flex-shrink-0 mt-0.5"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Link & Back Button */}
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/${locale}/request?service=${service.id}`}
              className="btn-primary text-xs py-2.5 px-4 justify-center flex-1 shadow-xs"
              tabIndex={isFlipped ? 0 : -1}
              id={`service-flip-cta-${service.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              {t.services.requestService}
              <ArrowIcon size={14} />
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsFlipped(false)
              }}
              className="py-2.5 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#132038] text-[#64748b] dark:text-[#94a3b8] hover:text-[#0284c7] dark:hover:text-[#38bdf8] hover:border-[#0284c7]/40 text-xs font-medium transition-colors flex items-center justify-center shrink-0 active:scale-95"
              aria-label={locale === 'ar' ? 'العودة' : 'Back'}
              title={locale === 'ar' ? 'العودة' : 'Back'}
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ServicesSection({ locale }: ServicesSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'

  return (
    <section
      id="services"
      className="section-padding bg-[#f8fafc] dark:bg-[#0b1628]"
      aria-labelledby="services-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`max-w-2xl mb-14 ${isRTL ? 'text-right' : 'text-left'}`}>
          <span className="section-label">{t.services.sectionLabel}</span>
          <h2 id="services-heading" className="section-title">
            {t.services.title}
          </h2>
          <p className="section-subtitle">{t.services.subtitle}</p>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.services.items.map((service, i) => (
            <div
              key={service.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <ServiceCard
                service={service}
                locale={locale}
                isRTL={isRTL}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
