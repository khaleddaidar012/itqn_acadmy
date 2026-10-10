import Link from 'next/link'
import { ArrowLeft, ArrowRight, MessageCircle } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

interface CtaSectionProps {
  locale: Locale
}

export function CtaSection({ locale }: CtaSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <section
      id="contact"
      className="section-padding bg-[#f8fafc] dark:bg-[#0b1628]"
      aria-labelledby="cta-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-[#0f2744] text-white p-6 sm:p-12 lg:p-16 text-center">
          {/* Subtle accent */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#38bdf8]/40 to-transparent" />
          </div>

          <div className="relative z-10 max-w-xl mx-auto">
            <h2 id="cta-heading" className="text-3xl sm:text-4xl font-bold mb-3 leading-tight text-white">
              {t.cta.title}
            </h2>
            <p className="text-base text-[#94b4d4] mb-8 leading-relaxed">
              {t.cta.subtitle}
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={`/${locale}/request`}
                id="cta-request-btn"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-semibold text-sm rounded-xl transition-all duration-200 active:scale-[0.98] shadow-[0_4px_16px_rgba(56,189,248,0.35)]"
              >
                {t.cta.requestProject}
                <ArrowIcon size={16} />
              </Link>
              <a
                href="https://wa.me/201061532875"
                target="_blank"
                rel="noopener noreferrer"
                id="cta-whatsapp-btn"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm rounded-xl transition-all duration-200 active:scale-[0.98]"
              >
                <MessageCircle size={16} />
                {t.cta.whatsapp}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
