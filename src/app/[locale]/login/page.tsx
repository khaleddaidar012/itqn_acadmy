import AuthForm from '@/components/system/AuthForm'
export const metadata = { title: 'تسجيل الدخول', robots: { index: false, follow: false } }
export default async function Login({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <AuthForm locale={locale} />
}
