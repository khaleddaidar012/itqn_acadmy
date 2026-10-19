'use client'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutDashboard, Users, GraduationCap, CalendarDays, ClipboardList, BookOpen, CalendarPlus, ShieldCheck, Settings, LogOut, ArrowUpRight, ChevronDown, Menu, CreditCard } from 'lucide-react'

const labels: Record<string, string> = { overview: 'الرئيسية', accounts: 'فريق الأكاديمية', students: 'الطلاب', week: 'الجدول', history: 'سجل الحصص', progress: 'تقدم الحفظ', schedule: 'تعيين حصة', excuses: 'الاعتذارات', payments: 'المدفوعات', studentReports: 'التقارير', settings: 'الإعدادات' }
const icons = { overview: LayoutDashboard, accounts: Users, students: GraduationCap, week: CalendarDays, history: ClipboardList, progress: BookOpen, schedule: CalendarPlus, excuses: ShieldCheck, payments: CreditCard, studentReports: ClipboardList, settings: Settings }
type Props = { name: string; role: string; locale: string; tabs: { id: string; label: string }[]; active: string; select: (id: string) => void; busy: boolean; logout: () => void; requests: number }
export default function SystemHeader({ name, role, locale, tabs, active, select, busy, logout, requests }: Props) {
  function sectionButton(t: Props['tabs'][number], mobile = false) {
    const Icon = icons[t.id as keyof typeof icons] || LayoutDashboard
    const selected = active === t.id
    return <button key={t.id} title={t.label} onClick={event => { select(t.id); if (mobile) event.currentTarget.closest('details')?.removeAttribute('open') }} aria-current={selected ? 'page' : undefined} className={'relative flex flex-1 shrink-0 items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ' + (mobile ? 'gap-2 px-3 py-3 text-sm ' : 'min-w-[72px] flex-col gap-1.5 px-2 py-2.5 text-xs xl:text-[13px] ') + (selected ? 'bg-[#eaf4ed] text-[#125e49]' : 'text-[#647269] hover:bg-[#f5f7f3] hover:text-[#173b32]')}><Icon size={19} strokeWidth={selected ? 2 : 1.7} /><span className="whitespace-nowrap">{labels[t.id] || t.label}</span>{t.id === 'excuses' && requests > 0 && <span className="absolute top-0.5 left-0.5 rounded-full min-w-4 px-1 text-[10px] leading-4 text-center bg-amber-100 text-amber-900">{requests}</span>}</button>
  }
  return <header className="sticky top-0 z-40 border-b border-[#e2e9df] bg-white/95 backdrop-blur-lg">
    <div className="relative max-w-[1536px] mx-auto px-4 sm:px-6 min-h-[80px] flex items-center gap-3 xl:gap-5">
      <div className="flex shrink-0 items-center gap-2"><Image src="/logo.png" alt="أكاديمية إتقان" width={40} height={40} className="object-contain" /><div className="hidden sm:block"><p className="font-bold text-sm">أكاديمية إتقان</p><p className="text-[10px] text-slate-400 mt-0.5">مساحة الأكاديمية</p></div></div>
      <nav aria-label="أقسام النظام" className="hidden lg:flex min-w-0 flex-1 gap-1 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{tabs.map(t => sectionButton(t))}</nav>
      <details className="lg:hidden flex-1 group"><summary className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-center gap-2 rounded-xl bg-[#eaf4ed] text-[#125e49] px-3 py-3 text-sm font-semibold cursor-pointer"><Menu size={18} /><span>{labels[active] || 'أقسام النظام'}</span><ChevronDown size={14} className="group-open:rotate-180" /></summary><nav aria-label="أقسام النظام للموبايل" className="absolute top-full left-4 right-4 mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-[#e2e9df] bg-white p-3 shadow-xl">{tabs.map(t => sectionButton(t, true))}</nav></details>
      <div className="flex shrink-0 items-center gap-1.5 border-r border-[#edf0e9] pr-2 sm:pr-3">
        <details className="relative group"><summary aria-label="قائمة الحساب" title={name} className="list-none [&::-webkit-details-marker]:hidden flex items-center gap-1.5 cursor-pointer rounded-xl p-1.5 hover:bg-[#f5f7f3]"><span className="w-8 h-8 rounded-full bg-[#eaf3ee] flex items-center justify-center font-bold text-emerald-800">{name.trim().charAt(0)}</span><ChevronDown size={13} className="text-slate-400 group-open:rotate-180" /></summary><div className="absolute left-0 top-full mt-3 w-60 rounded-2xl border border-[#e2e9df] bg-white p-4 shadow-xl"><p className="font-bold text-sm truncate">{name}</p><p className="text-xs text-slate-500 mt-1">{role}</p><Link href={'/' + locale} className="mt-4 flex items-center gap-2 text-sm text-emerald-800"><ArrowUpRight size={16} />زيارة الموقع</Link></div></details>
        <button disabled={busy} onClick={logout} title="تسجيل الخروج" aria-label="تسجيل الخروج" className="rounded-xl p-2.5 text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"><LogOut size={18} /></button>
      </div>
    </div>
  </header>
}
