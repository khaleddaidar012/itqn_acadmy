import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { RateLimiterMemory } from 'rate-limiter-flexible'

// Rate limiter: max 3 requests per IP per 10 minutes
const rateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60 * 10,
})

const serviceLabels: Record<string, { ar: string; en: string }> = {
  website: { ar: 'موقع إلكتروني', en: 'Website' },
  ecommerce: { ar: 'متجر إلكتروني', en: 'E-Commerce Store' },
  system: { ar: 'نظام مخصص', en: 'Custom System' },
  saas: { ar: 'حل SaaS', en: 'SaaS Solution' },
  other: { ar: 'أخرى', en: 'Other' },
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePhone(phone: string): boolean {
  return /^[+\d\s\-()]{7,20}$/.test(phone)
}

function sanitize(str: string): string {
  return str.replace(/[<>]/g, '').trim().slice(0, 1000)
}

export async function POST(req: NextRequest) {
  const ip = getIP(req)

  // Rate limiting
  try {
    await rateLimiter.consume(ip)
  } catch {
    return NextResponse.json(
      { error: 'too_many_requests', message: 'Too many requests. Please wait a few minutes.' },
      { status: 429 }
    )
  }

  // Parse body
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { name, phone, email, service, description } = body

  // Validation
  const errors: Record<string, string> = {}
  if (!name || name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
  if (!phone || !validatePhone(phone)) errors.phone = 'Invalid phone number'
  if (!email || !validateEmail(email)) errors.email = 'Invalid email address'
  if (!service) errors.service = 'Service is required'
  if (!description || description.trim().length < 20)
    errors.description = 'Description must be at least 20 characters'

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'validation', errors }, { status: 422 })
  }

  // Honeypot / spam check
  if ((body as any).website_url) {
    // Silent discard for bots
    return NextResponse.json({ success: true })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const toEmail = process.env.RESEND_TO_EMAIL || 'khaledhesham012@gmail.com'

  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not set')
    return NextResponse.json(
      { error: 'config_error', message: 'Email service not configured' },
      { status: 500 }
    )
  }

  const resend = new Resend(resendApiKey)
  const serviceLabel =
    serviceLabels[service]?.ar || service

  const emailSubject = `طلب خدمة جديد: ${serviceLabel} — ${sanitize(name)}`

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; direction: rtl; background: #f9fafb; margin: 0; padding: 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1d61d5, #3b96f4); border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header p { color: #dbeffe; margin: 6px 0 0; font-size: 14px; }
    .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-weight: 600; }
    .value { font-size: 16px; color: #111827; margin-bottom: 20px; padding: 10px 14px; background: #f3f4f6; border-radius: 6px; }
    .service-badge { display: inline-block; background: #dbeffe; color: #1d61d5; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🚀 طلب خدمة جديد</h1>
      <p>دعيدر للحلول البرمجية | Daidar Solutions</p>
    </div>
    
    <div class="label">الخدمة المطلوبة</div>
    <div class="value"><span class="service-badge">${serviceLabel}</span></div>
    
    <div class="label">الاسم</div>
    <div class="value">${sanitize(name)}</div>
    
    <div class="label">رقم الهاتف / واتساب</div>
    <div class="value">${sanitize(phone)}</div>
    
    <div class="label">البريد الإلكتروني</div>
    <div class="value">${sanitize(email)}</div>
    
    <div class="label">وصف المشروع</div>
    <div class="value" style="white-space: pre-wrap;">${sanitize(description)}</div>
    
    <div class="footer">
      تم إرسال هذا الطلب من موقع دعيدر للحلول البرمجية<br>
      ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
    </div>
  </div>
</body>
</html>
  `.trim()

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: sanitize(email),
      subject: emailSubject,
      html: htmlContent,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'email_failed', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'server_error', message: 'Unexpected server error' },
      { status: 500 }
    )
  }
}
