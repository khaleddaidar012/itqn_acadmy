/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
      { key: 'Permissions-Policy', value: 'geolocation=(), camera=(self), microphone=(self)' },
      ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
    ] }]
  },
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig

if (process.env.ITQAN_USE_D1 === '1' && process.env.NODE_ENV === 'development') {
  require('@opennextjs/cloudflare').initOpenNextCloudflareForDev(
    process.env.ITQAN_D1_PERSIST_PATH ? { persist: { path: process.env.ITQAN_D1_PERSIST_PATH } } : undefined
  )
}
