import { legalPages } from '@/data/legal'
export const metadata = { title: 'Zoom Terms | شروط التكامل — ITQAN Academy' }
export default async function Terms({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;const lang=locale==='en'?'en':'ar',page=legalPages.terms[lang]
  return <main className="max-w-4xl mx-auto px-5 pt-32 pb-20" dir={lang==='ar'?'rtl':'ltr'}><h1 className="text-3xl font-bold">{page.title}</h1><p className="text-slate-500 mt-3">{lang==='ar'?'آخر تحديث: ٢٧ أكتوبر ٢٠٢٦':'Updated: 27 October 2026'}</p>{page.sections.map(([heading,text])=><section key={heading} className="mt-8"><h2 className="text-xl font-bold mb-3">{heading}</h2><p className="leading-8">{text}</p></section>)}<a className="inline-block underline mt-8" href={`/${lang}/privacy`}>{lang==='ar'?'سياسة الخصوصية':'Privacy Policy'}</a></main>
}
