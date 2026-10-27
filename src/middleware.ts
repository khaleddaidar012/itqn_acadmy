import { NextRequest, NextResponse } from 'next/server'

const locales = ['ar', 'en'] as const
const defaultLocale = 'ar'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip API routes, static files, and _next
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/sitemap') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next()
  }

  // A fresh nonce requires request-time HTML and must never be cached/reused.
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')
  const development = process.env.NODE_ENV !== 'production'
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    // React style attributes and Framer Motion require inline styles; scripts do not.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${development ? ' ws: wss:' : ''}`,
    "object-src 'none'", "base-uri 'self'", "form-action 'self'",
    "frame-ancestors 'self'", "frame-src 'none'",
  ].join('; ')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', policy)

  // Check if locale is already in pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('Content-Security-Policy', policy)
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }

  // Redirect to default locale
  const url = request.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`
  const response = NextResponse.redirect(url)
  response.headers.set('Content-Security-Policy', policy)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png|logo-light.png|robots.txt|sitemap.xml).*)'],
}
