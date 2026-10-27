import type { Metadata, Viewport } from 'next'
import { Cairo, Inter } from 'next/font/google'
import '../styles/globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://itqanacademy.com'),
  title: {
    template: '%s | أكاديمية إتقان للقرآن الكريم',
    default: 'أكاديمية إتقان للقرآن الكريم | ITQAN Quran Academy',
  },
  description:
    'أكاديمية إتقان لتعليم وتحفيظ القرآن الكريم وتدريس أحكام التجويد والتلاوة عبر الإنترنت لكافة الأعمار والمستويات بنخبة من المعلمين والمعلمات ذوي الخبرة والكفاءة.',
  keywords: [
    'أكاديمية إتقان',
    'تحفيظ قرآن كريم',
    'دورة تجويد',
    'تعليم القرآن عن بعد',
    'ITQAN Quran Academy',
    'Online Quran Memorization',
    'Tajweed Course',
    'Quran Recitation',
  ],
  authors: [{ name: 'ITQAN Quran Academy' }],
  creator: 'ITQAN Quran Academy',
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    alternateLocale: 'en_US',
    siteName: 'أكاديمية إتقان للقرآن الكريم | ITQAN Quran Academy',
    images: [{ url: '/logo.png', width: 800, height: 800, alt: 'ITQAN Quran Academy Logo' }],
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const nonce = (await headers()).get('x-nonce') || undefined
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('itqan-theme');
                if (stored === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}

              try {
                if (typeof MutationObserver !== 'undefined') {
                  const observer = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                      for (const node of m.addedNodes) {
                        if (
                          node.nodeType === 1 &&
                          (node.id?.includes('dz-') ||
                           node.className?.toString?.().includes('dz-container') ||
                           node.id?.includes('acjicnehenlkmfnfpbjbpfnjegbelbpj'))
                        ) {
                          node.remove();
                        }
                      }
                    }
                  });
                  observer.observe(document.documentElement, { childList: true, subtree: true });
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${cairo.variable} ${inter.variable} font-arabic antialiased bg-[#f8fafc] dark:bg-[#0b1628] text-[#0f2744] dark:text-[#e8f0fb] transition-colors duration-200`}
      >
        <ThemeProvider nonce={nonce}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
