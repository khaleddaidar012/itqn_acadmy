import Link from 'next/link'
import { ArrowLeft, ArrowRight, ExternalLink, Globe, ShoppingCart, Cpu, Layers, CheckCircle2 } from 'lucide-react'
import type { Project, Locale } from '@/types'

interface ProjectDetailProps {
  locale: Locale
  project: Project
}

const categoryIcons = {
  website: Globe,
  ecommerce: ShoppingCart,
  system: Cpu,
  saas: Layers,
}

const categoryLabels = {
  ar: {
    website: 'موقع إلكتروني',
    ecommerce: 'متجر إلكتروني',
    system: 'نظام مخصص',
    saas: 'حل SaaS',
  },
  en: {
    website: 'Website',
    ecommerce: 'E-Commerce',
    system: 'Custom System',
    saas: 'SaaS Solution',
  },
}

export function ProjectDetail({ locale, project }: ProjectDetailProps) {
  const isRTL = locale === 'ar'
  const BackArrow = isRTL ? ArrowRight : ArrowLeft
  const Icon = categoryIcons[project.category]
  const labels = categoryLabels[locale]

  const title = isRTL ? project.titleAr : project.titleEn
  const description = isRTL ? project.descriptionAr : project.descriptionEn
  const longDescription = isRTL ? project.longDescriptionAr : project.longDescriptionEn
  const technologies = isRTL ? project.technologiesAr : project.technologiesEn
  const features = isRTL ? project.featuresAr : project.featuresEn
  const categoryLabel = labels[project.category]

  return (
    <div className="pt-24 pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">

          {/* Back navigation */}
          <div className="mb-8">
            <Link
              href={`/${locale}/portfolio`}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-gold-300 bg-white dark:bg-brand-900/40 hover:bg-slate-50 dark:hover:bg-brand-800/60 border border-slate-200 dark:border-slate-700/50 px-3.5 py-1.5 rounded-full transition-all duration-200 shadow-sm group"
            >
              <BackArrow
                size={15}
                className="transition-transform duration-200 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 text-brand-600 dark:text-gold-400"
              />
              <span>{isRTL ? 'العودة إلى الأعمال' : 'Back to Portfolio'}</span>
            </Link>
          </div>

          {/* Hero card */}
          <div className="rounded-3xl overflow-hidden border border-gold-300/30 dark:border-brand-700/40 bg-white dark:bg-brand-900/40 shadow-sm mb-8">
            {/* Visual */}
            <div className="relative h-56 sm:h-72 bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 flex items-center justify-center">
              <Icon size={72} className="text-brand-400 dark:text-brand-500" />
            </div>

            {/* Meta */}
            <div className="p-6 sm:p-8 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-100 dark:bg-brand-800 text-gold-700 dark:text-gold-300 text-xs font-semibold">
                <Icon size={13} />
                {categoryLabel}
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-900 dark:text-cream-100 leading-snug">
                {title}
              </h1>

              <p className="text-base text-charcoal-800/80 dark:text-cream-200/70 leading-relaxed">
                {description}
              </p>

              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
                >
                  <ExternalLink size={15} />
                  {isRTL ? 'زيارة الموقع' : 'Visit Site'}
                </a>
              )}
            </div>
          </div>

          {/* Long description */}
          {longDescription && (
            <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-cream-50 dark:bg-brand-900/30 border border-gold-300/20 dark:border-brand-700/30">
              <h2 className="font-bold text-lg text-brand-900 dark:text-cream-100 mb-3">
                {isRTL ? 'نبذة عن المشروع' : 'About This Project'}
              </h2>
              <p className="text-sm sm:text-base text-charcoal-800/80 dark:text-cream-200/70 leading-relaxed whitespace-pre-line">
                {longDescription}
              </p>
            </div>
          )}

          {/* Features */}
          {features.length > 0 && (
            <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-cream-50 dark:bg-brand-900/30 border border-gold-300/20 dark:border-brand-700/30">
              <h2 className="font-bold text-lg text-brand-900 dark:text-cream-100 mb-4">
                {isRTL ? 'المميزات الرئيسية' : 'Key Features'}
              </h2>
              <ul className="space-y-2.5">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-charcoal-800/80 dark:text-cream-200/70">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-brand-500 dark:text-gold-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technologies */}
          {technologies.length > 0 && (
            <div className="p-6 sm:p-8 rounded-3xl bg-cream-50 dark:bg-brand-900/30 border border-gold-300/20 dark:border-brand-700/30">
              <h2 className="font-bold text-lg text-brand-900 dark:text-cream-100 mb-4">
                {isRTL ? 'التقنيات المستخدمة' : 'Technologies Used'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {technologies.map((tech, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-gold-300 text-xs font-semibold"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
