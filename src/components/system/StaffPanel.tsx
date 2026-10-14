'use client'
import { useEffect, useState } from 'react'
import type { User } from '@/lib/system/db'
import { allowed, grants, PERMISSIONS, DEFAULT_MANAGER, type Permission } from '@/lib/system/permissions'
type Props = { user: User; staff: User[]; busy: boolean; initialType: string; act: (body: Record<string, unknown>) => Promise<boolean> }
export default function StaffPanel({ user, staff, busy, initialType, act }: Props) {
  const [kind, setKind] = useState(initialType)
  const [selected, setSelected] = useState<Permission[]>(initialType === 'manager' ? DEFAULT_MANAGER : [])
  useEffect(() => { setKind(initialType); setSelected(initialType === 'manager' ? DEFAULT_MANAGER : []) }, [initialType])
  function choose(value: string) { setKind(value); setSelected(value === 'manager' ? DEFAULT_MANAGER : []) }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form)
    const body = { ...Object.fromEntries(values.entries()), action: 'createUser', role: kind === 'parent' ? 'parent' : 'teacher', rate: values.get('rate') || 0, currency: values.get('currency') || 'EGP', ...(user.role === 'admin' ? { permissions: kind === 'parent' ? [] : selected } : {}) }
    if (await act(body)) form.reset()
  }
  return <div className="space-y-6">
    {allowed(user, 'staff_create') && <section className="bg-white rounded-2xl border p-6"><h2 className="text-xl font-bold mb-2">إضافة معلم أو موظف</h2><p className="text-sm text-slate-500 mb-5">بيانات دخول مستقلة لكل شخص. الأدمن وحده يمنح الصلاحيات.</p><form onSubmit={create} className="grid sm:grid-cols-2 gap-5">
      <label>نوع الحساب<select className="system-input" value={kind} onChange={e => choose(e.target.value)}><option value="teacher">معلم</option>{user.role === 'admin' && <><option value="manager">موظف / مسؤول سيستم</option><option value="parent">ولي أمر</option></>}</select></label>
      <label>الاسم<input name="name" className="system-input" required maxLength={100} /></label><label>البريد الإلكتروني<input name="email" type="email" className="system-input" required /></label><label>كلمة المرور الأولية<input name="password" type="password" autoComplete="new-password" className="system-input" minLength={12} maxLength={256} required /></label>
      {allowed(user, 'pay_view') && kind !== 'parent' && <><label>سعر الساعة<input name="rate" type="number" min={0} max={100000} step="0.01" defaultValue={0} className="system-input" required /></label><label>العملة<select name="currency" className="system-input"><option value="EGP">جنيه مصري</option><option value="USD">دولار</option></select></label></>}
      {user.role === 'admin' && kind !== 'parent' && <fieldset className="sm:col-span-2 rounded-xl bg-emerald-50/50 p-4"><legend className="font-bold px-1">صلاحيات الحساب — كل اختيار مستقل</legend><PermissionChoices value={selected} change={setSelected} /><p className="text-xs text-slate-500 mt-3">رؤية السعر منفصلة عن رؤية الساعات. تغيير الأجر يحتاج صلاحية تعديل البيانات ورؤية السعر معًا. الموظف يمكنه التدريس أيضًا؛ اجعل أجره صفرًا إذا كان إداريًا فقط.</p></fieldset>}
      <button disabled={busy} className="system-button sm:col-span-2">إنشاء الحساب</button>
    </form></section>}
    <section className="bg-white rounded-2xl border p-6"><h2 className="text-xl font-bold mb-5">فريق الأكاديمية <span className="text-sm text-slate-500">({staff.length})</span></h2>{!staff.length && <p className="text-slate-500">لم تضف معلمين أو موظفين بعد.</p>}<div className="space-y-4">{staff.map(member => <StaffEditor key={`${member.id}:${member.permissions}:${member.name}:${member.email}:${member.rate}`} user={user} member={member} act={act} busy={busy} />)}</div></section>
  </div>
}
function PermissionChoices({ value, change }: { value: Permission[]; change: (value: Permission[]) => void }) {
  return <div className="grid sm:grid-cols-2 gap-3 mt-3">{PERMISSIONS.map(p => <label key={p.key} className="flex gap-3 items-center text-sm"><input type="checkbox" checked={value.includes(p.key)} onChange={e => change(e.target.checked ? [...value, p.key] : value.filter(k => k !== p.key))} />{p.label}</label>)}</div>
}
function StaffEditor({ user, member, act, busy }: { user: User; member: User; act: Props['act']; busy: boolean }) {
  const [permissions, setPermissions] = useState(grants({ ...member, role: 'teacher' }))
  const edit = allowed(user, 'staff_edit'); const pay = allowed(user, 'pay_view')
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget)
    await act({ action: 'updateTeacher', id: member.id, ...Object.fromEntries(values.entries()), ...(user.role === 'admin' ? { permissions } : {}) })
  }
  return <article className="rounded-2xl border bg-slate-50/40 p-5"><div className="flex justify-between gap-3 mb-4"><div><h3 className="font-bold">{member.name}</h3><p className="text-xs text-slate-500 mt-1">{member.manage ? 'معلم / مسؤول سيستم' : 'معلم'}</p></div>{allowed(user, 'staff_delete') && member.id !== user.id && <button type="button" disabled={busy} className="text-sm text-red-700 border border-red-200 rounded-lg px-3 py-2" onClick={() => { if (window.confirm(`حذف حساب ${member.name}؟ سيتم إيقاف الدخول وإلغاء الحصص المستقبلية غير المبدوءة، مع الاحتفاظ بسجل الحصص السابقة.`)) void act({ action: 'deleteTeacher', id: member.id }) }}>حذف المعلم</button>}</div>
    <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">{edit && <><label>الاسم<input name="name" className="system-input" defaultValue={member.name} required maxLength={100} /></label><label>البريد الإلكتروني<input name="email" type="email" className="system-input" defaultValue={member.email} required /></label></>}
      {pay && (edit ? <><label>سعر الساعة<input name="rate" type="number" min={0} max={100000} step="0.01" defaultValue={member.rate} className="system-input" required /></label><label>العملة<select name="currency" defaultValue={member.currency} className="system-input"><option value="EGP">EGP</option><option value="USD">USD</option></select></label></> : <p className="text-sm">سعر الساعة: {member.rate} {member.currency}</p>)}
      {user.role === 'admin' && <fieldset className="sm:col-span-2"><legend className="font-bold text-sm">صلاحيات مسؤول النظام</legend><PermissionChoices value={permissions} change={setPermissions} /></fieldset>}
      {edit && <button disabled={busy} className="system-button sm:col-span-2">حفظ البيانات والصلاحيات</button>}
    </form>
  </article>
}
