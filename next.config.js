/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['node:sqlite'],
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
