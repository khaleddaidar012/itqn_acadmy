import Link from 'next/link'
import { MapPin, Mail, Phone, MessageSquare, Facebook, Instagram, Sparkles, Send } from 'lucide-react'
import { getTranslations } from '@/locales'
import { ACADEMY_CONTACT } from '@/data/pricing'
import type { Locale } from '@/types'

interface ContactSectionProps {
  locale: Locale
}

export function ContactSection({ locale }: ContactSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'

  return (
    <section
      id="contact"
      className="py-24 bg-white dark:bg-[#07241e] relative overflow-hidden"
      aria-labelledby="contact-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-200 dark:bg-brand-900/60 border border-gold-400/30 text-xs font-bold text-brand-800 dark:text-gold-300">
            <Sparkles size={12} className="text-gold-500" />
            <span>{t.contact.sectionLabel}</span>
          </div>

          <h2
            id="contact-heading"
            className="text-2xl sm:text-4xl font-extrabold text-brand-900 dark:text-cream-100 tracking-tight"
          >
            {t.contact.title}
          </h2>

          <div className="flex items-center justify-center gap-3 py-1 text-gold-500">
            <span className="w-12 h-px bg-gold-400/50" />
            <span className="text-lg">❖</span>
            <span className="w-12 h-px bg-gold-400/50" />
          </div>

          <p className="text-sm sm:text-base text-charcoal-800/80 dark:text-cream-200/80 max-w-xl mx-auto">
            {t.contact.subtitle}
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          
          {/* Card 1: WhatsApp Direct */}
          <div className="bg-cream-50 dark:bg-brand-900/40 border border-gold-300/40 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                <MessageSquare size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-brand-900 dark:text-cream-100">
                  {t.contact.whatsappTitle}
                </h3>
                <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300" dir="ltr">
                  {ACADEMY_CONTACT.whatsappNumber}
                </p>
              </div>
            </div>
            <div className="pt-6">
              <a
                href={`https://wa.me/${ACADEMY_CONTACT.whatsappRaw}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>{t.contact.directWhatsappBtn}</span>
              </a>
            </div>
          </div>

          {/* Card 2: Email */}
          <div className="bg-cream-50 dark:bg-brand-900/40 border border-gold-300/40 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-800/80 text-brand-700 dark:text-gold-300 flex items-center justify-center">
                <Mail size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-brand-900 dark:text-cream-100">
                  {t.contact.emailTitle}
                </h3>
                <p className="text-xs sm:text-sm font-medium text-charcoal-800/80 dark:text-cream-200/80 break-all select-all">
                  {ACADEMY_CONTACT.email}
                </p>
              </div>
            </div>
            <div className="pt-6">
              <a
                href={`mailto:${ACADEMY_CONTACT.email}`}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-brand-800 dark:text-cream-100 bg-white dark:bg-brand-800 border border-gold-300/40 hover:bg-gold-50 dark:hover:bg-brand-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>{locale === 'ar' ? 'إرسال بريد إلكتروني' : 'Send an Email'}</span>
              </a>
            </div>
          </div>

          {/* Card 3: Location */}
          <div className="bg-cream-50 dark:bg-brand-900/40 border border-gold-300/40 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gold-100 dark:bg-brand-800/80 text-gold-700 dark:text-gold-300 flex items-center justify-center">
                <MapPin size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-brand-900 dark:text-cream-100">
                  {t.contact.locationTitle}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-charcoal-800/90 dark:text-cream-200/90">
                  {t.contact.locationVal}
                </p>
                <p className="text-xs text-charcoal-800/60 dark:text-cream-200/60">
                  {locale === 'ar' ? 'فصول تعليمية مباشرة عبر الإنترنت' : 'Online classes available globally'}
                </p>
              </div>
            </div>
            <div className="pt-6">
              <div className="flex items-center justify-center gap-3 py-1">
                <a
                  href={ACADEMY_CONTACT.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-brand-800 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label="Facebook"
                >
                  <Facebook size={18} />
                </a>
                <a
                  href={ACADEMY_CONTACT.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-pink-50 dark:bg-brand-800 text-pink-600 dark:text-pink-400 flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label="Instagram"
                >
                  <Instagram size={18} />
                </a>
                <a
                  href={ACADEMY_CONTACT.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-brand-800 text-black dark:text-white flex items-center justify-center hover:scale-110 transition-transform font-bold text-xs"
                  aria-label="TikTok"
                >
                  TT
                </a>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
