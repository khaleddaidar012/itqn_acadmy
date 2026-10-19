'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, Globe, Sun, Moon, LogIn, ArrowUpLeft } from 'lucide-react'
import { getTranslations } from '@/locales'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useRegion } from '@/components/providers/RegionProvider'
import type { Locale } from '@/types'
import clsx from 'clsx'

interface NavbarProps {
  locale: Locale
}

export function Navbar({ locale }: NavbarProps) {
  const t = getTranslations(locale)
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { region, isLoaded } = useRegion()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const otherLocale: Locale = locale === 'ar' ? 'en' : 'ar'
  const localePath = pathname.replace(`/${locale}`, `/${otherLocale}`)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const navLinks = [
    { href: `/${locale}`, label: t.nav.home },
    { href: `/${locale}#about`, label: t.nav.about },
    { href: `/${locale}#programs`, label: t.nav.programs },
    { href: `/${locale}#why-us`, label: t.nav.whyUs },
    { href: `/${locale}#pricing`, label: t.nav.packages },
    { href: `/${locale}#contact`, label: t.nav.contact },
  ]

  return (
    <header
      className={clsx(
        'fixed top-0 inset-x-0 z-40 transition-all duration-300',
        scrolled
          ? 'bg-white/95 dark:bg-[#07241e]/95 backdrop-blur-md shadow-[0_4px_20px_rgba(7,91,74,0.08)] border-b border-brand-100 dark:border-brand-900/40'
          : 'bg-white/80 dark:bg-[#07241e]/80 backdrop-blur-sm border-b border-cream-200/60 dark:border-brand-900/20'
      )}
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <nav
        className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-3 rounded-lg group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label={locale === 'ar' ? 'أكاديمية إتقان للقرآن الكريم' : 'ITQAN Quran Academy'}
        >
          <div className="relative w-12 h-12 flex-shrink-0 transition-transform duration-200 group-hover:scale-105 rounded-full overflow-hidden bg-white shadow-sm border border-gold-300/30">
            <Image
              src="/logo.png"
              alt="شعار أكاديمية إتقان للقرآن الكريم"
              fill
              sizes="48px"
              className="object-contain p-1"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-brand-800 dark:text-cream-100 text-base sm:text-lg leading-tight tracking-tight">
              {locale === 'ar' ? 'أكاديمية إتقان' : 'ITQAN Academy'}
            </span>
            <span className="text-[11px] text-gold-600 dark:text-gold-400 font-medium">
              {locale === 'ar' ? 'للقرآن الكريم والتجويد' : 'Quran & Islamic Studies'}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-lg text-sm font-medium text-charcoal-800 dark:text-cream-100/90 hover:text-brand-600 dark:hover:text-gold-300 hover:bg-brand-50/70 dark:hover:bg-brand-900/30 transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Region / Currency Switcher */}
          <span
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-cream-200 dark:bg-brand-900/60 text-brand-800 dark:text-gold-300 border border-gold-300/40 hover:bg-gold-100 dark:hover:bg-brand-800 transition-all duration-200"
            title="العملة حسب بلد الاتصال / Currency based on your country"
          >
            <span>{!isLoaded ? '…' : region === 'EG' ? '🇪🇬 ج.م EGP' : '🌐 $ USD'}</span>
          </span>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="hidden sm:inline-flex p-2 rounded-lg text-charcoal-800 dark:text-cream-200 hover:text-gold-600 hover:bg-cream-200 dark:hover:bg-brand-900/40 transition-colors"
            aria-label="تبديل المظهر / Toggle theme"
            id="theme-toggle-btn"
          >
            <Sun size={18} className="hidden dark:block text-gold-400" />
            <Moon size={18} className="block dark:hidden text-brand-700" />
          </button>

          {/* Language Switch */}
          <Link
            href={localePath}
            onClick={() => { document.cookie = `itqan_language=${otherLocale}; Path=/; Max-Age=31536000; SameSite=Lax`; setIsMenuOpen(false) }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-charcoal-800 dark:text-cream-100 hover:text-brand-600 hover:bg-cream-200 dark:hover:bg-brand-900/40 transition-colors"
            aria-label={`Switch to ${otherLocale === 'ar' ? 'Arabic' : 'English'}`}
          >
            <Globe size={14} />
            <span>{t.lang.switchTo}</span>
          </Link>

          {/* Primary CTA Button */}
          <Link
            href={`/${locale}/login`}
            className="inline-flex shrink-0 items-center gap-2 px-3 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-800 border border-gold-300/30 shadow-[0_4px_14px_rgba(7,91,74,0.25)] hover:shadow-[0_6px_20px_rgba(7,91,74,0.35)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
            id="nav-login-btn"
          >
            <LogIn size={16} className="text-gold-300" />
            <span>{locale === 'ar' ? 'تسجيل الدخول' : 'Sign in'}</span>
            <ArrowUpLeft size={14} className="hidden xl:block text-gold-300" />
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-charcoal-800 dark:text-cream-100 hover:bg-cream-200 dark:hover:bg-brand-900/40 transition-colors"
            aria-label={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <div
        className={clsx(
          'lg:hidden fixed inset-0 top-20 z-30 transition-all duration-300',
          isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        )}
      >
        <div
          className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
        <div
          className={clsx(
            'relative bg-white dark:bg-[#07241e] border-b border-cream-200 dark:border-brand-900/60 p-6 shadow-xl transition-transform duration-300',
            isMenuOpen ? 'translate-y-0' : '-translate-y-2'
          )}
        >
          <div className="flex flex-col gap-1.5 mb-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-base font-medium text-charcoal-800 dark:text-cream-100 hover:bg-cream-100 dark:hover:bg-brand-900/50 hover:text-brand-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-cream-200 dark:border-brand-900/40">
            {/* Region / Currency Switch in mobile */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-cream-100 dark:bg-brand-900/40 rounded-xl">
              <span className="text-sm font-medium text-charcoal-800 dark:text-cream-200">
                {locale === 'ar' ? 'المنطقة والعملة:' : 'Region & Currency:'}
              </span>
              <span
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-600 text-white"
              >
                {!isLoaded ? '…' : region === 'EG' ? '🇪🇬 مصر (ج.م)' : '🌐 دولي ($ USD)'}
              </span>
            </div>

            <Link
              href={localePath}
              onClick={() => { document.cookie = `itqan_language=${otherLocale}; Path=/; Max-Age=31536000; SameSite=Lax`; setIsMenuOpen(false) }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cream-300 dark:border-brand-800 text-sm font-medium text-charcoal-800 dark:text-cream-100"
            >
              <Globe size={16} />
              <span>{t.lang.switchTo}</span>
            </Link>

            <button type="button" onClick={toggleTheme} className="flex justify-center items-center gap-2 py-3 rounded-xl border border-cream-300 dark:border-brand-800 text-sm">
              <Sun size={16} className="hidden dark:block" /><Moon size={16} className="dark:hidden" />
              {locale === 'ar' ? 'تغيير المظهر' : 'Change theme'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
