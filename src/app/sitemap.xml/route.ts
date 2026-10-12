import { NextRequest, NextResponse } from 'next/server'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://itqanacademy.com'

export const dynamic = 'force-static'

export async function GET(req: NextRequest) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${siteUrl}/ar</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${siteUrl}/ar"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en"/>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/en</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${siteUrl}/ar"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en"/>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
