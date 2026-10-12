'use client'

import Link from 'next/link'
import { ExternalLink, Globe, ShoppingCart, Cpu, Layers } from 'lucide-react'
import type { Project, Locale } from '@/types'

interface PortfolioGridProps {
  locale: Locale
  projects: Project[]
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

export function PortfolioGrid({ locale, projects }: PortfolioGridProps) {
  const isRTL = locale === 'ar'
  const labels = categoryLabels[locale]

  if (projects.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          {isRTL ? 'لا توجد مشاريع منشورة حالياً.' : 'No projects published yet.'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => {
        const Icon = categoryIcons[project.category]
        const title = isRTL ? project.titleAr : project.titleEn
        const description = isRTL ? project.descriptionAr : project.descriptionEn
        const categoryLabel = labels[project.category]

        return (
          <Link
            key={project.id}
            href={`/${locale}/portfolio/${project.slug}`}
            className="group relative bg-white dark:bg-brand-900/40 border border-gold-300/30 dark:border-brand-700/40 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            {/* Thumbnail / Placeholder */}
            <div className="relative h-48 bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 flex items-center justify-center overflow-hidden">
              <Icon
                size={56}
                className="text-brand-400 dark:text-brand-600 group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
              {/* Category badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-100 dark:bg-brand-800 text-gold-700 dark:text-gold-300 text-xs font-semibold">
                <Icon size={12} />
                {categoryLabel}
              </span>

              <h2 className="font-bold text-base text-brand-900 dark:text-cream-100 leading-snug group-hover:text-brand-600 dark:group-hover:text-gold-300 transition-colors">
                {title}
              </h2>

              <p className="text-sm text-charcoal-800/70 dark:text-cream-200/60 line-clamp-2 leading-relaxed">
                {description}
              </p>

              {/* CTA */}
              <div className="flex items-center gap-1 pt-1 text-xs font-semibold text-brand-600 dark:text-gold-400 group-hover:gap-2 transition-all">
                <ExternalLink size={13} />
                <span>{isRTL ? 'عرض التفاصيل' : 'View Details'}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
