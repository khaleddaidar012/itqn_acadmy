'use client'
import { useCallback, useEffect, useState } from 'react'

type Status = { configured: boolean; canConnect: boolean; autoEndEnabled?:boolean; connection: { email: string; connected: string; expires: number } | null }
export default function ZoomSettings({ locale }: { locale: string }) {
  const [status, setStatus] = useState<Status | null>(null), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    const response = await fetch('/api/zoom', { cache: 'no-store' }), data = await response.json()
    if (!response.ok) throw new Error(data.error || 'تعذر قراءة حالة Zoom')
    setStatus(data)
  }, [])
  useEffect(() => {
    void load().catch(e => setError(e.message))
    const url = new URL(window.location.href), result = url.searchParams.get('zoom')
    if (result) {
      if (result === 'connected') setNotice('تم ربط حساب Zoom بنجاح.')
      else if (result === 'cancelled') setNotice('تم إلغاء الربط؛ يمكنك المحاولة مجددًا.')
      else {
        const messages: Record<string, string> = {
          failed_token_exchange: 'رفض Zoom تبادل التفويض. راجع تطابق Client ID وClient secret مع بيئة Development وعنوان العودة، ثم ابدأ محاولة جديدة.',
          failed_token_response: 'استجابة تفويض Zoom غير مكتملة. أعد المحاولة أو تواصل مع الإدارة.',
          failed_profile_fetch: 'تم قبول التفويض، لكن تعذرت قراءة حساب Zoom. راجع صلاحية user:read:user في التطبيق.',
          failed_profile_id: 'استجابة Zoom لا تحتوي معرّف المستخدم المطلوب. أبلغ الإدارة.',
          failed_profile_email: 'استجابة Zoom لا تحتوي البريد المطلوب لربط الحساب. أبلغ الإدارة.',
          failed_profile_account: 'استجابة Zoom لا تحتوي معرّف الحساب المتوقع. أبلغ الإدارة لإتمام توافق الربط.',
          failed_storage: 'تم التفويض وقراءة الحساب، لكن تعذر حفظ الربط. راجع الإدارة لفحص قاعدة البيانات وأي ربط سابق.',
          failed_connection: 'تعذر الاتصال بـZoom أثناء إتمام الربط. ابدأ محاولة جديدة.',
        }
        setError(messages[result] || 'تعذر إتمام الربط. تواصل مع الإدارة لتحديد السبب.')
      }
      url.searchParams.delete('zoom'); window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
  }, [load])
  async function action(type: 'connect' | 'disconnect' | 'reauthorize') {
    if (type === 'disconnect' && !window.confirm('هل تريد إلغاء تفويض Zoom وفصل حسابك عن الأكاديمية؟')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/zoom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: type, locale }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      if (type === 'connect' || type === 'reauthorize') { window.location.assign(data.url); return }
      await load(); setNotice('تم فصل حساب Zoom وإلغاء التفويض.')
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر الاتصال') } finally { setBusy(false) }
  }
  return <section className="bg-white rounded-2xl border p-6 mb-6 max-w-2xl"><h2 className="text-xl font-bold">ربط حساب Zoom</h2>
    <p className="text-sm text-slate-600 mt-3 leading-7">كل مدرس يربط حسابه بنفسه من صفحة Zoom الرسمية. لا تطلب الأكاديمية كلمة مرور Zoom. التفويض يُحفظ مشفّرًا على الخادم ويمكن إلغاؤه من هنا أو من حساب Zoom.</p>
    <p className="text-sm text-slate-500 mt-2 leading-7">يمكن تجهيز اجتماع لكل حصة من جدولك، ثم فتحه من خمس دقائق قبل الموعد. يسجّل Zoom دخولك وخروجك لحساب وقت الحضور الفعلي. بعد إضافة صلاحيات الاجتماعات اضغط تحديث صلاحيات Zoom ووافق بنفس الحساب المربوط.</p>
    {status?.autoEndEnabled && <p className="text-sm text-amber-800 mt-2 leading-7">الإغلاق التلقائي مفعّل: يُطلب إنهاء الاجتماع عند نهاية مدة الحصة بفحص كل دقيقة. يلزم الموافقة على صلاحية إنهاء الاجتماعات، وقد يتأخر الإغلاق مع انقطاع الاتصال. احتساب الأجر يتوقف عند الموعد المحدد.</p>}
    {error && <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 mt-4">{error}</p>}
    {notice && <p role="status" className="text-emerald-800 bg-emerald-50 rounded-xl p-3 mt-4">{notice}</p>}
    {!status && !error && <p role="status" className="mt-4">جارٍ التحقق من الربط…</p>}
    {status && !status.configured && <p className="bg-amber-50 text-amber-900 rounded-xl p-4 mt-4 text-sm leading-7">الربط غير مفعّل بعد. يلزم أن تضبط الإدارة تطبيق Zoom وعنوان العودة ومفتاح تشفير التفويضات في إعدادات الخادم.</p>}
    {status?.connection && <div className="border rounded-xl p-4 mt-4"><p className="font-bold text-emerald-800">حساب مربوط</p><p dir="ltr" className="text-right break-all mt-2">{status.connection.email}</p><p className="text-xs text-slate-500 mt-2">تاريخ الربط: {new Date(status.connection.connected).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' })}</p></div>}
    {status?.configured && status.canConnect && <button disabled={busy} className="system-button mt-5" onClick={() => void action(status.connection ? 'disconnect' : 'connect')}>{busy ? 'جارٍ التنفيذ…' : status.connection ? 'فصل حساب Zoom' : 'ربط حسابي عبر Zoom'}</button>}
    {status?.configured && status.canConnect && status.connection && <button disabled={busy} className="system-button mt-5 mx-2" onClick={()=>void action('reauthorize')}>تحديث صلاحيات Zoom</button>}
    {status && !status.canConnect && <p className="text-sm text-slate-500 mt-4">يظهر زر الربط للمعلمين بحساباتهم. الإدارة تراجع جاهزية التطبيق من هنا.</p>}
  </section>
}
