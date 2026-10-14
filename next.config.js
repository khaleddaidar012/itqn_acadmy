/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
