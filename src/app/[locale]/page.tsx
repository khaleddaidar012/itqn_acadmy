import type { Metadata } from 'next'
import type { Locale } from '@/types'
import { HeroSection } from '@/components/sections/HeroSection'
import { AboutSection } from '@/components/sections/AboutSection'
import { ProgramsSection } from '@/components/sections/ProgramsSection'
import { WhyUsSection } from '@/components/sections/WhyUsSection'
import { PricingSection } from '@/components/sections/PricingSection'
import { ContactSection } from '@/components/sections/ContactSection'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const isArabic = locale === 'ar'

  return {
    title: isArabic
      ? 'أكاديمية إتقان للقرآن الكريم | ابدأ رحلتك مع القرآن الكريم'
      : 'ITQAN Quran Academy | Begin Your Journey with the Holy Quran',
    description: isArabic
      ? 'تعلم القرآن الكريم حفظًا وتلاوةً وتجويدًا، بخطة تعليمية تناسب مستواك ووقتك مع نخبة من المعلمين والمعلمات ذوي الخبرة والكفاءة.'
      : 'Learn the Holy Quran through memorization, recitation, and Tajweed with a structured plan tailored to your level and schedule.',
    openGraph: {
      title: isArabic
        ? 'أكاديمية إتقان للقرآن الكريم | إتقان أكاديمي'
        : 'ITQAN Quran Academy | Excellence in Quranic Education',
      description: isArabic
        ? 'أكاديمية رائدة في تدريس وتحفيظ القرآن الكريم وتدريس أحكام التجويد عن بُعد لكافة المستويات والأعمار.'
        : 'Leading academy for online Quran memorization, Tajweed courses, and recitation practice worldwide.',
      images: [{ url: '/logo.png', width: 800, height: 800, alt: 'ITQAN Quran Academy' }],
    },
  }
}

export default async function HomePage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale

  return (
    <>
      <HeroSection locale={locale} />
      <AboutSection locale={locale} />
      <ProgramsSection locale={locale} />
      <WhyUsSection locale={locale} />
      <PricingSection locale={locale} />
      <ContactSection locale={locale} />
    </>
  )
}
