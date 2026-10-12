'use client'

import { useState, useId } from 'react'
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import type { Locale, ServiceId } from '@/types'

interface RequestFormProps {
  locale: Locale
}

interface FormState {
  name: string
  phone: string
  email: string
  service: ServiceId
  description: string
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error' | 'rate_limited'

const serviceOptions: { value: ServiceId; labelAr: string; labelEn: string }[] = [
  { value: '', labelAr: 'اختر نوع الخدمة', labelEn: 'Select a service type' },
  { value: 'website', labelAr: 'موقع إلكتروني', labelEn: 'Website' },
  { value: 'ecommerce', labelAr: 'متجر إلكتروني', labelEn: 'E-Commerce Store' },
  { value: 'system', labelAr: 'نظام مخصص', labelEn: 'Custom System' },
  { value: 'saas', labelAr: 'حل SaaS', labelEn: 'SaaS Solution' },
]

const t = {
  ar: {
    name: 'الاسم الكامل',
    namePlaceholder: 'أدخل اسمك الكامل',
    phone: 'رقم الهاتف / واتساب',
    phonePlaceholder: '+966 5xx xxx xxx',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'name@example.com',
    service: 'نوع الخدمة المطلوبة',
    description: 'وصف المشروع',
    descriptionPlaceholder: 'اشرح لنا مشروعك أو الخدمة التي تحتاجها (20 حرفاً على الأقل)...',
    submit: 'إرسال الطلب',
    submitting: 'جارٍ الإرسال...',
    successTitle: 'تم إرسال طلبك بنجاح!',
    successMsg: 'شكراً لتواصلك معنا. سيصلك ردنا في أقرب وقت ممكن.',
    errorMsg: 'حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.',
    rateLimitMsg: 'لقد تجاوزت الحد المسموح به من الطلبات. يرجى الانتظار قليلاً ثم المحاولة مجدداً.',
    required: 'هذا الحقل مطلوب',
  },
  en: {
    name: 'Full Name',
    namePlaceholder: 'Enter your full name',
    phone: 'Phone / WhatsApp',
    phonePlaceholder: '+966 5xx xxx xxx',
    email: 'Email Address',
    emailPlaceholder: 'name@example.com',
    service: 'Service Type',
    description: 'Project Description',
    descriptionPlaceholder: 'Describe your project or the service you need (at least 20 characters)...',
    submit: 'Send Request',
    submitting: 'Sending...',
    successTitle: 'Your request was sent successfully!',
    successMsg: "Thank you for reaching out. We'll get back to you as soon as possible.",
    errorMsg: 'An error occurred while sending. Please try again.',
    rateLimitMsg: 'Too many requests. Please wait a few minutes and try again.',
    required: 'This field is required',
  },
}

export function RequestForm({ locale }: RequestFormProps) {
  const strings = t[locale]
  const isRTL = locale === 'ar'
  const uid = useId()

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    service: '',
    description: '',
  })
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const inputBase =
    'w-full px-4 py-3 rounded-xl text-sm bg-white dark:bg-brand-900/60 border border-slate-200 dark:border-slate-700/60 text-brand-900 dark:text-cream-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-gold-400 focus:border-transparent transition-all'

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setFieldErrors({})

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (res.status === 429) {
        setStatus('rate_limited')
        return
      }

      if (res.status === 422 && data.errors) {
        setFieldErrors(data.errors)
        setStatus('idle')
        return
      }

      if (!res.ok) {
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <CheckCircle2 size={36} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-brand-900 dark:text-cream-100">{strings.successTitle}</h3>
        <p className="text-sm text-charcoal-800/70 dark:text-cream-200/60 max-w-sm">{strings.successMsg}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'} noValidate>
      {/* Honeypot */}
      <input type="text" name="website_url" className="hidden" tabIndex={-1} aria-hidden="true" />

      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor={`${uid}-name`} className="block text-sm font-semibold text-brand-900 dark:text-cream-100">
          {strings.name} <span className="text-red-500">*</span>
        </label>
        <input
          id={`${uid}-name`}
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder={strings.namePlaceholder}
          className={inputBase}
          required
          autoComplete="name"
        />
        {fieldErrors.name && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} /> {fieldErrors.name}
          </p>
        )}
      </div>

      {/* Phone + Email row */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-phone`} className="block text-sm font-semibold text-brand-900 dark:text-cream-100">
            {strings.phone} <span className="text-red-500">*</span>
          </label>
          <input
            id={`${uid}-phone`}
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder={strings.phonePlaceholder}
            className={inputBase}
            required
            autoComplete="tel"
            dir="ltr"
          />
          {fieldErrors.phone && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} /> {fieldErrors.phone}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${uid}-email`} className="block text-sm font-semibold text-brand-900 dark:text-cream-100">
            {strings.email} <span className="text-red-500">*</span>
          </label>
          <input
            id={`${uid}-email`}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder={strings.emailPlaceholder}
            className={inputBase}
            required
            autoComplete="email"
            dir="ltr"
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} /> {fieldErrors.email}
            </p>
          )}
        </div>
      </div>

      {/* Service */}
      <div className="space-y-1.5">
        <label htmlFor={`${uid}-service`} className="block text-sm font-semibold text-brand-900 dark:text-cream-100">
          {strings.service} <span className="text-red-500">*</span>
        </label>
        <select
          id={`${uid}-service`}
          name="service"
          value={form.service}
          onChange={handleChange}
          className={`${inputBase} cursor-pointer`}
          required
        >
          {serviceOptions.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
              {isRTL ? opt.labelAr : opt.labelEn}
            </option>
          ))}
        </select>
        {fieldErrors.service && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} /> {fieldErrors.service}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor={`${uid}-description`} className="block text-sm font-semibold text-brand-900 dark:text-cream-100">
          {strings.description} <span className="text-red-500">*</span>
        </label>
        <textarea
          id={`${uid}-description`}
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder={strings.descriptionPlaceholder}
          rows={5}
          className={`${inputBase} resize-none`}
          required
        />
        {fieldErrors.description && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} /> {fieldErrors.description}
          </p>
        )}
      </div>

      {/* Error messages */}
      {(status === 'error' || status === 'rate_limited') && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{status === 'rate_limited' ? strings.rateLimitMsg : strings.errorMsg}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading'}
        id="request-form-submit"
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-all duration-200 shadow-sm hover:shadow-md"
      >
        {status === 'loading' ? (
          <>
            <Loader2 size={17} className="animate-spin" />
            {strings.submitting}
          </>
        ) : (
          <>
            <Send size={16} />
            {strings.submit}
          </>
        )}
      </button>
    </form>
  )
}
