'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'
import clsx from 'clsx'

interface RequestFormProps {
  locale: Locale
  preSelectedService?: string
}

interface FormData {
  name: string
  phone: string
  email: string
  service: string
  description: string
  website_url: string // honeypot
}

interface FormErrors {
  name?: string
  phone?: string
  email?: string
  service?: string
  description?: string
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

const serviceIds = ['website', 'ecommerce', 'system', 'saas', 'other'] as const

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePhone(phone: string): boolean {
  return /^[+\d\s\-()]{7,20}$/.test(phone)
}

export function RequestForm({ locale, preSelectedService }: RequestFormProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    service: preSelectedService || '',
    description: '',
    website_url: '', // honeypot stays empty
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Read service from URL param or props on mount
  useEffect(() => {
    if (preSelectedService) {
      setFormData((prev) => ({ ...prev, service: preSelectedService }))
    } else if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const serviceParam = params.get('service')
      if (serviceParam && (serviceIds as readonly string[]).includes(serviceParam)) {
        setFormData((prev) => ({ ...prev, service: serviceParam }))
      }
    }
  }, [preSelectedService])

  function validate(data: FormData): FormErrors {
    const errs: FormErrors = {}
    const v = t.request.validation

    if (!data.name.trim() || data.name.trim().length < 2) {
      errs.name = data.name.trim() === '' ? v.nameRequired : v.nameMin
    }
    if (!data.phone.trim()) {
      errs.phone = v.phoneRequired
    } else if (!validatePhone(data.phone)) {
      errs.phone = v.phoneInvalid
    }
    if (!data.email.trim()) {
      errs.email = v.emailRequired
    } else if (!validateEmail(data.email)) {
      errs.email = v.emailInvalid
    }
    if (!data.service) {
      errs.service = v.serviceRequired
    }
    if (!data.description.trim()) {
      errs.description = v.descriptionRequired
    } else if (data.description.trim().length < 20) {
      errs.description = v.descriptionMin
    }

    return errs
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (touched[name]) {
      const newData = { ...formData, [name]: value }
      const newErrors = validate(newData)
      setErrors((prev) => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }))
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    const newErrors = validate(formData)
    setErrors((prev) => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Mark all as touched
    const allTouched = Object.keys(formData).reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {} as Record<string, boolean>
    )
    setTouched(allTouched)

    const validationErrors = validate(formData)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    setStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          service: formData.service,
          description: formData.description,
          website_url: formData.website_url, // honeypot
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setErrorMessage(
            locale === 'ar'
              ? 'لقد أرسلت عدة طلبات مؤخراً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.'
              : 'Too many requests. Please wait a few minutes and try again.'
          )
        } else if (data.errors) {
          setErrors(data.errors)
          setErrorMessage(t.request.errorMessage)
        } else {
          setErrorMessage(data.message || t.request.errorMessage)
        }
        setStatus('error')
        return
      }

      setStatus('success')
    } catch (err) {
      setErrorMessage(t.request.errorMessage)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="card-base rounded-3xl p-12 text-center animate-scale-in">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {t.request.successTitle}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t.request.successMessage}
        </p>
        <button
          onClick={() => {
            setStatus('idle')
            setFormData({ name: '', phone: '', email: '', service: '', description: '', website_url: '' })
            setErrors({})
            setTouched({})
          }}
          className="btn-secondary"
        >
          {locale === 'ar' ? 'إرسال طلب آخر' : 'Send Another Request'}
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={t.request.pageTitle}
      className="card-base rounded-3xl p-8 space-y-6"
    >
      {/* Honeypot - hidden from users */}
      <input
        type="text"
        name="website_url"
        value={formData.website_url}
        onChange={handleChange}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
      />

      {/* Error Alert */}
      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 animate-scale-in">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{t.request.errorTitle}</div>
            <div className="text-sm mt-0.5">{errorMessage || t.request.errorMessage}</div>
          </div>
        </div>
      )}

      {/* Name */}
      <div>
        <label
          htmlFor="req-name"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {t.request.name} <span className="text-red-500">*</span>
        </label>
        <input
          id="req-name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t.request.namePlaceholder}
          autoComplete="name"
          className={clsx('input-field', touched.name && errors.name && 'input-error')}
          aria-invalid={touched.name && !!errors.name}
          aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
        />
        {touched.name && errors.name && (
          <p id="name-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle size={12} />
            {errors.name}
          </p>
        )}
      </div>

      {/* Phone & Email Row */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="req-phone"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {t.request.phone} <span className="text-red-500">*</span>
          </label>
          <input
            id="req-phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={t.request.phonePlaceholder}
            autoComplete="tel"
            dir="ltr"
            className={clsx('input-field', touched.phone && errors.phone && 'input-error')}
            aria-invalid={touched.phone && !!errors.phone}
            aria-describedby={touched.phone && errors.phone ? 'phone-error' : undefined}
          />
          {touched.phone && errors.phone && (
            <p id="phone-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="req-email"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {t.request.email} <span className="text-red-500">*</span>
          </label>
          <input
            id="req-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={t.request.emailPlaceholder}
            autoComplete="email"
            dir="ltr"
            className={clsx('input-field', touched.email && errors.email && 'input-error')}
            aria-invalid={touched.email && !!errors.email}
            aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
          />
          {touched.email && errors.email && (
            <p id="email-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.email}
            </p>
          )}
        </div>
      </div>

      {/* Service */}
      <div>
        <label
          htmlFor="req-service"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {t.request.service} <span className="text-red-500">*</span>
        </label>
        <select
          id="req-service"
          name="service"
          value={formData.service}
          onChange={handleChange}
          onBlur={handleBlur}
          className={clsx('input-field', touched.service && errors.service && 'input-error')}
          aria-invalid={touched.service && !!errors.service}
          aria-describedby={touched.service && errors.service ? 'service-error' : undefined}
        >
          <option value="">{t.request.servicePlaceholder}</option>
          {serviceIds.map((id) => (
            <option key={id} value={id}>
              {t.request.services[id]}
            </option>
          ))}
        </select>
        {touched.service && errors.service && (
          <p id="service-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle size={12} />
            {errors.service}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="req-description"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {t.request.description} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="req-description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t.request.descriptionPlaceholder}
          rows={5}
          className={clsx('input-field resize-none', touched.description && errors.description && 'input-error')}
          aria-invalid={touched.description && !!errors.description}
          aria-describedby={touched.description && errors.description ? 'description-error' : undefined}
        />
        <div className="flex justify-between mt-1">
          {touched.description && errors.description ? (
            <p id="description-error" className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.description}
            </p>
          ) : (
            <span />
          )}
          <span className={clsx('text-xs', formData.description.length < 20 ? 'text-gray-400' : 'text-green-500')}>
            {formData.description.length}/1000
          </span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="btn-primary w-full justify-center text-base py-4 disabled:opacity-60 disabled:cursor-not-allowed"
        id="submit-request-btn"
      >
        {status === 'submitting' ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {t.request.submitting}
          </>
        ) : (
          <>
            <Send size={18} />
            {t.request.submit}
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        {locale === 'ar'
          ? 'بإرسال هذا النموذج، أنت توافق على أن نتواصل معك بخصوص طلبك.'
          : 'By submitting this form, you agree to be contacted regarding your request.'}
      </p>
    </form>
  )
}
