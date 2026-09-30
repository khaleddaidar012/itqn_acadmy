import ar from './ar'
import en from './en'

export type TranslationKeys = typeof ar
export type Locale = 'ar' | 'en'

export const translations: Record<Locale, TranslationKeys> = { ar, en: en as unknown as TranslationKeys }

export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale] ?? translations.ar
}

export { ar, en }
