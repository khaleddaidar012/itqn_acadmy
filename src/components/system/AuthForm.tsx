'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AuthForm({ register, locale }: { register?: boolean; locale: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: register ? 'register' : 'login', name: data.get('name'), email: data.get('email'), password: data.get('password'), subjects: data.getAll('subjects') }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      router.replace(`/${locale}/dashboard`); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر الاتصال بالخادم') } finally { setBusy(false) }
  }
  return <main dir="rtl" className="min-h-screen pt-28 pb-20 px-4 bg-[#f6f8f5] text-[#163b32]">
    <div className="max-w-md mx-auto rounded-3xl bg-white p-8 shadow-sm border border-[#dde6df]">
      <Link href={`/${locale}`} className="text-sm text-emerald-700">← العودة لأكاديمية إتقان</Link>
      <p className="text-xs tracking-widest text-emerald-600 mt-8">إتقان • رحلة علم وأثر</p>
      <h1 className="text-3xl font-bold mt-3">{register ? 'ابدأ رحلتك التعليمية' : 'أهلًا بعودتك'}</h1>
      <p className="text-sm text-slate-500 mt-3 mb-8">{register ? 'التسجيل هنا للطلاب. تختار موادك، والإدارة ترتب جدولك مع المعلم المناسب.' : 'حساب واحد للدخول إلى مساحة الإدارة أو المعلم أو الطالب أو ولي الأمر.'}</p>
      <form onSubmit={submit} className="space-y-5">
        {register && <label className="block">اسم الطالب<input name="name" required maxLength={100} autoComplete="name" className="system-input" /></label>}
        <label className="block">البريد الإلكتروني<input name="email" type="email" required autoComplete="email" dir="ltr" className="system-input" /></label>
        <label className="block">كلمة المرور<input name="password" type="password" required minLength={register ? 12 : 1} maxLength={256} autoComplete={register ? 'new-password' : 'current-password'} className="system-input" />{register && <span className="text-xs text-slate-500">12 حرفًا على الأقل</span>}</label>
        {register && <fieldset><legend className="mb-3">المواد التي ترغب في دراستها</legend>{['حفظ القرآن', 'التجويد', 'اللغة العربية'].map(subject => <label key={subject} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 mb-2"><input type="checkbox" name="subjects" value={subject} />{subject}</label>)}</fieldset>}
        {error && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
        <button disabled={busy} className="system-button w-full">{busy ? 'جارٍ التنفيذ…' : register ? 'إنشاء حساب الطالب' : 'تسجيل الدخول'}</button>
      </form>
      <p className="text-sm mt-6 text-center">{register ? 'لديك حساب؟' : 'طالب جديد؟'} <Link className="font-bold text-emerald-700" href={`/${locale}/${register ? 'login' : 'register'}`}>{register ? 'تسجيل الدخول' : 'إنشاء حساب'}</Link></p>
    </div>
  </main>
}
