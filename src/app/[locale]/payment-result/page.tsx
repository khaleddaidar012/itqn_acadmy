import PaymentsPanel from '@/components/system/PaymentsPanel'
import Link from 'next/link'
export const dynamic='force-dynamic'
export const metadata={title:'نتيجة الدفع',robots:{index:false,follow:false},referrer:'no-referrer' as const}
export default async function PaymentResult({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{order?:string}>}) {
  const {locale}=await params;const {order}=await searchParams
  return <main className="min-h-screen pt-10 pb-16 px-4 bg-[#f6f8f5]"><div className="max-w-3xl mx-auto"><p className="font-bold text-xl text-emerald-900 mb-6">{locale==='ar'?'أكاديمية إتقان':'ITQAN Academy'}</p><PaymentsPanel locale={locale} orderId={order || 'missing'} /><Link href={`/${locale}/dashboard`} className="inline-block mt-6 text-emerald-800">{locale==='ar'?'العودة إلى حسابي':'Return to my account'}</Link></div></main>
}
