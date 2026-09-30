import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { Locale } from '@/types'
import { getProjectBySlug, getPublishedProjects } from '@/data/projects'
import { ProjectDetail } from '@/components/portfolio/ProjectDetail'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const projects = getPublishedProjects()
  return [
    ...projects.map((p) => ({ locale: 'ar', slug: p.slug })),
    ...projects.map((p) => ({ locale: 'en', slug: p.slug })),
  ]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const project = getProjectBySlug(slug)
  if (!project) return {}
  
  const isArabic = locale === 'ar'
  return {
    title: isArabic ? project.titleAr : project.titleEn,
    description: isArabic ? project.descriptionAr : project.descriptionEn,
  }
}

export default async function ProjectPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const project = getProjectBySlug(slug)
  if (!project) notFound()

  return <ProjectDetail locale={locale} project={project} />
}
