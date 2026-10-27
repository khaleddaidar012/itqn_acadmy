'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
type Directory = { name: string; queryPermission(options: { mode: 'readwrite' }): Promise<string>; requestPermission(options: { mode: 'readwrite' }): Promise<string>; getFileHandle(name: string, options: { create: boolean }): Promise<{ createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void>; abort(): Promise<void> }> }> }
type State = { enabled: boolean; latest: null | { id: string; completed: string; sha256: string; bytes: number }; receipt: null | { saved: string; backup_id: string }; warning: string; lastRun: null | { status: string; error: string } }
async function folderStore(key: string, value?: Directory): Promise<Directory | undefined> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('itqan-local-backups', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('folders')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => { const database = open.result; const transaction = database.transaction('folders', value ? 'readwrite' : 'readonly'); const request = value ? transaction.objectStore('folders').put(value, key) : transaction.objectStore('folders').get(key); transaction.oncomplete = () => { database.close(); resolve(value || request.result) }; transaction.onerror = () => { database.close(); reject(transaction.error) } }
  })
}
export default function BackupSettings({ userId, visible }: { userId: number; visible: boolean }) {
  const [state, setState] = useState<State>(); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [folder, setFolder] = useState(''); const [auto, setAuto] = useState(false); const [busy, setBusy] = useState(false)
  const working = useRef(false); const device = useRef(''); const saved = useRef(''); const supported = useRef(false)
  const namespace = `itqan-backup-${userId}`
  const post = useCallback(async (body: Record<string, unknown>) => { const r = await fetch('/api/backups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const result = await r.json(); if (!r.ok) throw new Error(result.error); return result }, [])
  const refresh = useCallback(async () => { const r = await fetch('/api/backups?device=' + device.current, { cache: 'no-store' }); const result = await r.json(); if (!r.ok) throw new Error(result.error); setState(result); return result as State }, [])
  const save = useCallback(async (latest: NonNullable<State['latest']>, handle: Directory) => {
    const r = await fetch('/api/backups?download=' + latest.id, { cache: 'no-store' }); if (!r.ok) throw new Error('تعذر تنزيل النسخة')
    const data = await r.text(); const envelope = JSON.parse(data)
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(envelope.payload))
    const checksum = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    if (envelope.format !== 'itqan-backup' || checksum !== latest.sha256 || checksum !== envelope.sha256) throw new Error('فشل التحقق من سلامة النسخة')
    const file = await handle.getFileHandle(`itqan-${latest.id}.json`, { create: true }); const writable = await file.createWritable()
    try { await writable.write(data); await writable.close() } catch (e) { await writable.abort().catch(() => {}); throw e }
    await post({ action: 'receipt', device: device.current, id: latest.id, sha256: checksum })
    saved.current = latest.id; setNotice('تم حفظ نسخة سليمة في مجلد هذا الجهاز.'); await refresh()
  }, [post, refresh])
  useEffect(() => {
    let cancelled = false
    device.current = localStorage.getItem('itqan-backup-device') || crypto.randomUUID(); localStorage.setItem('itqan-backup-device', device.current)
    supported.current = 'showDirectoryPicker' in window
    setAuto(localStorage.getItem(namespace) === '1')
    const tick = async () => {
      if (working.current || cancelled) return; working.current = true
      try {
        const current = await refresh()
        if (cancelled || !current.enabled || !current.latest || localStorage.getItem(namespace) !== '1') return
        const handle = await folderStore(namespace); if (!handle) return
        setFolder(handle.name)
        if (await handle.queryPermission({ mode: 'readwrite' }) !== 'granted') { setError('يلزم السماح بالحفظ على هذا الجهاز. اضغط اختيار مجلد / تجديد الإذن.'); return }
        if (current.receipt?.backup_id !== current.latest.id && saved.current !== current.latest.id) await save(current.latest, handle)
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر الحفظ المحلي') } finally { working.current = false }
    }
    void tick(); const timer = setInterval(() => void tick(), 60000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [namespace, refresh, save])
  async function chooseFolder() {
    setError(''); setNotice(''); setBusy(true)
    try {
      const picker = (window as unknown as { showDirectoryPicker?: (options: { mode: 'readwrite' }) => Promise<Directory> }).showDirectoryPicker
      if (!picker) throw new Error('المتصفح لا يدعم الحفظ إلى مجلد. استخدم تنزيل النسخة يدويًا أو افتح Chrome / Edge على الكمبيوتر.')
      const handle = await picker.call(window, { mode: 'readwrite' })
      if (await handle.requestPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('لم يتم منح إذن الكتابة إلى المجلد')
      await folderStore(namespace, handle); localStorage.setItem(namespace, '1'); setAuto(true); setFolder(handle.name)
      const current = await refresh(); if (current.latest) await save(current.latest, handle)
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : 'تعذر اختيار المجلد') } finally { setBusy(false) }
  }
  async function action(body: Record<string, unknown>) { setBusy(true); setError(''); setNotice(''); try { await post(body); await refresh(); setNotice('تم حفظ الإعداد.'); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تنفيذ الطلب') } finally { setBusy(false) } }
  if (!visible) return null
  const when = (value?: string) => value ? new Date(value).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' }) : 'لم تُحفظ نسخة بعد'
  return <section className="bg-white rounded-2xl border p-6 mb-6"><h2 className="text-xl font-bold">النسخ الاحتياطي</h2><p className="text-sm text-slate-500 mt-2 leading-7">نسخة كاملة يوميًا الساعة ٦ صباحًا بتوقيت القاهرة. على كل جهاز جديد اختر مجلدًا مرة واحدة. الحفظ المحلي يعمل أثناء فتح النظام والسماح بالكتابة؛ إذا كان الجهاز مغلقًا، تُحفظ أحدث نسخة عند فتحه مجددًا.</p><label className="flex items-center gap-3 mt-5 font-semibold"><input type="checkbox" checked={state?.enabled || false} disabled={busy || !state} onChange={e => void action({ action: 'toggle', enabled: e.target.checked })} />تفعيل النسخ اليومي للأكاديمية</label><div className="grid sm:grid-cols-2 gap-4 mt-5"><p className="rounded-xl bg-slate-50 p-4 text-sm">آخر نسخة مجهزة على الخادم<strong className="block mt-2">{when(state?.latest?.completed)}</strong>{state?.latest && <span className="block text-xs mt-2">{(state.latest.bytes / 1024).toFixed(1)} KB • تم التحقق من سلامة البيانات</span>}</p><p className="rounded-xl bg-emerald-50 p-4 text-sm">آخر نسخة محفوظة محليًا على هذا الجهاز<strong className="block mt-2">{when(state?.receipt?.saved)}</strong><span className="block text-xs mt-2">{auto ? `الحفظ المحلي مفعّل ${folder ? 'في ' + folder : ''}` : 'الحفظ المحلي غير مفعّل على هذا الجهاز'}</span></p></div><div className="flex flex-wrap gap-3 mt-5"><button disabled={busy} onClick={() => void chooseFolder()} className="system-button">اختيار مجلد / تجديد الإذن</button>{auto && <button className="border rounded-xl px-4 py-3" onClick={() => { localStorage.removeItem(namespace); setAuto(false); setNotice('تم إيقاف الحفظ المحلي لهذا الجهاز.') }}>إيقاف الحفظ على هذا الجهاز</button>}<button disabled={busy} className="border rounded-xl px-4 py-3" onClick={() => void action({ action: 'create' })}>أخذ نسخة الآن</button>{state?.latest && <a className="border rounded-xl px-4 py-3" href={'/api/backups?download=' + state.latest.id}>تنزيل آخر نسخة</a>}</div><a className="inline-block underline text-emerald-800 mt-4" href="/api/privacy?ledger=1">تنزيل سجل الإغلاق الحالي للاستعادة — صالح 24 ساعة</a><p className="text-xs text-slate-500 mt-4 leading-6">النسخة تحتوي بيانات الأكاديمية وبصمات كلمات المرور، ولا تحتوي جلسات الدخول أو مفاتيح الدفع. احفظها في مكان خاص. التنزيل اليدوي لا يؤكد الحفظ في مجلد تلقائي. صلاحية النسخة للاستعادة 30 يومًا بحد أقصى وقد تقصر عند حلول موعد حذف طالب. احذف النسخ المنتهية من جهازك وأي مكان نسختها إليه؛ الخادم لا يستطيع مسحها عن بُعد. الاستعادة تتم إلى قاعدة جديدة باستخدام الأداة المرفقة مع سجل إغلاق حديث من رابط التنزيل أدناه، ولا يجوز استعادة البيانات المحذوفة خارجه.</p>{(error || state?.warning || state?.lastRun?.status === 'failed') && <p className="text-red-700 bg-red-50 rounded-xl p-3 mt-4 text-sm" role="alert">{error || state?.warning || state?.lastRun?.error}</p>}{notice && <p role="status" className="text-emerald-700 mt-3 text-sm">{notice}</p>}</section>
}
