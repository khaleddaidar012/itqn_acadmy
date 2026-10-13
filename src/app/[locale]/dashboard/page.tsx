import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/system/auth'
import Dashboard from '@/components/system/Dashboard'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'مساحتي التعليمية', robots: { index: false, follow: false } }
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!await currentUser()) redirect(`/${locale}/login`)
  return <Dashboard locale={locale} />
}
