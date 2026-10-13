import AuthForm from '@/components/system/AuthForm'
export const metadata = { title: 'حساب طالب جديد', robots: { index: false, follow: false } }
export default async function Register({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <AuthForm register locale={locale} />
}
