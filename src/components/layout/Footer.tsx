import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, Mail, MapPin, Facebook, Instagram, Clock, Sparkles } from 'lucide-react'
import { getTranslations } from '@/locales'
import { ACADEMY_CONTACT } from '@/data/pricing'
import type { Locale } from '@/types'

interface FooterProps {
  locale: Locale
}

export function Footer({ locale }: FooterProps) {
  const t = getTranslations(locale)
  const currentYear = new Date().getFullYear()

  const navLinks = [
    { href: `/${locale}`, label: t.nav.home },
    { href: `/${locale}#about`, label: t.nav.about },
    { href: `/${locale}#programs`, label: t.nav.programs },
    { href: `/${locale}#why-us`, label: t.nav.whyUs },
    { href: `/${locale}#pricing`, label: t.nav.packages },
    { href: `/${locale}#contact`, label: t.nav.contact },
    { href: `/${locale}/privacy`, label: locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy' },
    { href: `/${locale}/terms`, label: locale === 'ar' ? 'شروط تكامل Zoom' : 'Zoom Integration Terms' },
  ]

  return (
    <footer className="bg-[#051d17] text-cream-100 border-t border-gold-400/20 relative overflow-hidden">
      {/* Top subtle gold bar */}
      <div className="h-1 bg-gradient-to-r from-transparent via-gold-500/70 to-transparent" />

      {/* Main Footer Container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* 1. Brand Column */}
          <div className="space-y-4 lg:col-span-1">
            <Link href={`/${locale}`} className="flex items-center gap-3 group">
              <div className="relative w-11 h-11 flex-shrink-0 rounded-full overflow-hidden bg-white p-1 border border-gold-400/40">
                <Image
                  src="/logo.png"
                  alt="شعار أكاديمية إتقان للقرآن الكريم"
                  fill
                  sizes="44px"
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-base leading-tight">
                  {locale === 'ar' ? 'أكاديمية إتقان' : 'ITQAN Academy'}
                </span>
                <span className="text-xs text-gold-400 font-medium">
                  {locale === 'ar' ? 'للقرآن الكريم والتجويد' : 'Quran & Islamic Studies'}
                </span>
              </div>
            </Link>

            <p className="text-cream-200/75 text-xs sm:text-sm leading-relaxed">
              {t.footer.aboutText}
            </p>

            {/* Social Media Badges */}
            <div className="flex items-center gap-2.5 pt-2">
              <a
                href={ACADEMY_CONTACT.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-blue-600 flex items-center justify-center text-cream-100 transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={16} />
              </a>

              <a
                href={ACADEMY_CONTACT.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-pink-600 flex items-center justify-center text-cream-100 transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={16} />
              </a>


              <a
                href={`https://wa.me/${ACADEMY_CONTACT.whatsappRaw}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-emerald-600 flex items-center justify-center text-cream-100 transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle size={16} />
              </a>
            </div>
          </div>

          {/* 2. Quick Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-gold-400 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>{t.footer.quickLinks}</span>
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-cream-200/80 hover:text-gold-300 transition-colors inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Programs Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-gold-400 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <span>❖</span>
              <span>{t.footer.programsLinks}</span>
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-cream-200/80">
              <li>
                <Link href={`/${locale}#programs`} className="hover:text-gold-300 transition-colors">
                  {locale === 'ar' ? 'تحفيظ القرآن الكريم' : 'Quran Memorization'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}#programs`} className="hover:text-gold-300 transition-colors">
                  {locale === 'ar' ? 'دورة التجويد الميسر' : 'Tajweed Mastery Course'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}#programs`} className="hover:text-gold-300 transition-colors">
                  {locale === 'ar' ? 'تلاوة ومراجعة الحفظ' : 'Quran Recitation & Revision'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}#pricing`} className="hover:text-gold-300 transition-colors">
                  {locale === 'ar' ? 'باقات الطلاب الدوليين' : 'International Quran Classes'}
                </Link>
              </li>
            </ul>
          </div>

          {/* 4. Coordination & Contact */}
          <div className="space-y-4">
            <h4 className="font-bold text-gold-400 text-sm uppercase tracking-wider">
              {t.footer.contactTitle}
            </h4>

            <div className="space-y-3 text-xs sm:text-sm text-cream-200/85">
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-gold-400 flex-shrink-0 mt-0.5" />
                <span>{ACADEMY_CONTACT.locationAr}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail size={16} className="text-gold-400 flex-shrink-0" />
                <a href={`mailto:${ACADEMY_CONTACT.email}`} className="hover:text-gold-300 transition-colors">
                  {ACADEMY_CONTACT.email}
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <MessageCircle size={16} className="text-emerald-400 flex-shrink-0" />
                <a href={`https://wa.me/${ACADEMY_CONTACT.whatsappRaw}`} dir="ltr" className="hover:text-gold-300 font-mono">
                  {ACADEMY_CONTACT.whatsappNumber}
                </a>
              </div>

              <div className="pt-2 text-xs text-cream-200/60 leading-relaxed border-t border-brand-900/80">
                <span className="font-bold text-gold-400 block mb-0.5">{t.footer.workingHoursTitle}</span>
                <span>{t.footer.workingHoursVal}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-10 mt-10 border-t border-brand-900/90 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-cream-200/60 text-center sm:text-start">
          <p>
            {t.footer.rights} — {currentYear}
          </p>
          <p className="text-gold-400/80">
            {locale === 'ar' ? ACADEMY_CONTACT.taglineAr : ACADEMY_CONTACT.taglineEn}
          </p>
        </div>

      </div>
    </footer>
  )
}
