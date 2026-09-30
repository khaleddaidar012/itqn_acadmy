import { NextRequest, NextResponse } from 'next/server'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://daidarsolutions.com'

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
  <url>
    <loc>${siteUrl}/ar/portfolio</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${siteUrl}/ar/portfolio"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en/portfolio"/>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/en/portfolio</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${siteUrl}/ar/portfolio"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en/portfolio"/>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/ar/request</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${siteUrl}/ar/request"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en/request"/>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteUrl}/en/request</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${siteUrl}/ar/request"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en/request"/>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
