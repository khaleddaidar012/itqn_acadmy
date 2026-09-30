'use client'

import { useEffect } from 'react'
import type { Locale } from '@/types'

interface LocaleAttributesProps {
  locale: Locale
}

/**
 * Sets html lang and dir attributes for RTL/LTR support.
 * Also updates body font class based on locale.
 */
export function LocaleAttributes({ locale }: LocaleAttributesProps) {
  useEffect(() => {
    const html = document.documentElement
    html.lang = locale
    html.dir = locale === 'ar' ? 'rtl' : 'ltr'

    const body = document.body
    if (locale === 'ar') {
      body.classList.add('font-arabic')
      body.classList.remove('font-latin')
    } else {
      body.classList.add('font-latin')
      body.classList.remove('font-arabic')
    }
  }, [locale])

  return null
}
