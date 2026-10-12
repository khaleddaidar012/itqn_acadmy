import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 dark:bg-[#07241e] px-4">
      <div className="text-center space-y-4">
        <div className="text-8xl font-black text-gold-500">404</div>
        <h1 className="text-2xl font-bold text-brand-900 dark:text-cream-100">
          الصفحة غير موجودة | Page Not Found
        </h1>
        <p className="text-sm text-charcoal-800/70 dark:text-cream-200/70 max-w-sm mx-auto">
          عذراً، الصفحة التي تحاول الوصول إليها غير متوفرة.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <Link
            href="/ar"
            className="px-6 py-2.5 rounded-full font-bold text-sm bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-sm"
          >
            العودة للرئيسية
          </Link>
          <Link
            href="/en"
            className="px-6 py-2.5 rounded-full font-bold text-sm bg-cream-200 dark:bg-brand-800 text-brand-900 dark:text-cream-100 hover:bg-cream-300 transition-colors border border-gold-300/40"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
