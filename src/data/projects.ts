import type { Project } from '@/types'

const projects: Project[] = [
  {
    id: '1',
    slug: 'itqan-academy',
    category: 'website',
    status: 'published',
    titleAr: 'موقع أكاديمية إتقان',
    titleEn: 'ITQAN Quran Academy Website',
    descriptionAr: 'موقع تعليمي متكامل لأكاديمية إتقان للقرآن الكريم يدعم اللغتين العربية والإنجليزية.',
    descriptionEn: 'A fully bilingual educational website for ITQAN Quran Academy.',
    longDescriptionAr:
      'صُمم هذا الموقع لأكاديمية إتقان للقرآن الكريم بهدف تقديم تجربة تعليمية راقية عبر الإنترنت. يدعم الموقع اللغتين العربية والإنجليزية بشكل كامل، ويشمل صفحات البرامج التعليمية، الباقات والأسعار، نظام الدفع الإلكتروني، وقسم التواصل.',
    longDescriptionEn:
      'Designed for ITQAN Quran Academy to deliver a premium online educational experience. Fully bilingual (Arabic/English), the site includes program pages, pricing plans, online payment flow, and a contact section.',
    technologiesAr: ['Next.js 15', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Resend'],
    technologiesEn: ['Next.js 15', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Resend'],
    featuresAr: [
      'دعم كامل للغة العربية والإنجليزية (RTL/LTR)',
      'نظام الباقات والتسعير التفاعلي',
      'بوابة دفع إلكتروني مدمجة',
      'نموذج تواصل مع إرسال بريد إلكتروني',
      'تصميم متجاوب مع جميع الأجهزة',
    ],
    featuresEn: [
      'Full Arabic & English bilingual support (RTL/LTR)',
      'Interactive pricing plans system',
      'Integrated online payment gateway',
      'Contact form with email delivery',
      'Fully responsive across all devices',
    ],
    image: null,
    link: null,
    order: 1,
  },
]

export function getPublishedProjects(): Project[] {
  return projects
    .filter((p) => p.status === 'published')
    .sort((a, b) => a.order - b.order)
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug && p.status === 'published')
}
