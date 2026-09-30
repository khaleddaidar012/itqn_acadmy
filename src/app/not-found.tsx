import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="text-center">
        <div className="text-9xl font-bold gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          الصفحة غير موجودة
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Page Not Found
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/ar" className="btn-primary">
            العودة للرئيسية
          </Link>
          <Link href="/en" className="btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
