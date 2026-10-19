'use client'
import { useEffect, useState } from 'react'
export default function ProgressArc({ pages, name = 'الطالب' }: { pages: number; name?: string }) {
  const value = Math.max(0, Math.min(604, Number(pages) || 0))
  const percent = value / 604 * 100
  const [ready, setReady] = useState(false)
  useEffect(() => { const frame = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(frame) }, [])
  return <div className="w-52 max-w-full mx-auto text-center" role="progressbar" aria-label={`تقدم حفظ ${name}`} aria-valuemin={0} aria-valuemax={604} aria-valuenow={value} aria-valuetext={`${value} صفحة من 604، ${percent.toFixed(1)} بالمائة`}>
    <svg viewBox="0 0 220 135" className="w-full" aria-hidden="true"><path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="#edf2ee" strokeWidth="16" strokeLinecap="round" /><path d="M 20 110 A 90 90 0 0 1 200 110" pathLength="100" fill="none" stroke="#14816a" strokeWidth="16" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 - (ready ? percent : 0)} className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none" /><text x="110" y="98" textAnchor="middle" fill="#173b32" fontSize="30" fontWeight="700">{percent.toLocaleString('ar-EG', { maximumFractionDigits: 1 })}٪</text></svg>
    <p className="text-xs text-slate-500">{value.toLocaleString('ar-EG')} صفحة متقنة من ٦٠٤</p>
  </div>
}
