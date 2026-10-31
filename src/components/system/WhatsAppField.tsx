'use client'
import {useMemo,useState} from 'react'
import {getCountries,getCountryCallingCode,type CountryCode} from 'libphonenumber-js'
export default function WhatsAppField({locale}:{locale:string}) {
  const [country,setCountry]=useState<CountryCode>('EG')
  const countries=useMemo(()=>{
    const names=new Intl.DisplayNames([locale==='ar'?'ar':'en'],{type:'region'})
    return getCountries().map(code=>({code,name:names.of(code)||code,dial:getCountryCallingCode(code)})).sort((a,b)=>a.name.localeCompare(b.name,locale==='ar'?'ar':'en'))
  },[locale])
  return <fieldset className="space-y-2"><legend>رقم واتساب</legend>
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-2">
      <label className="min-w-0"><span className="sr-only">الدولة وكود الاتصال</span><select name="whatsapp_country" aria-label="الدولة وكود الاتصال" autoComplete="country" value={country} onChange={e=>setCountry(e.target.value as CountryCode)} className="system-input !mt-0 min-w-0" required>{countries.map(c=><option value={c.code} key={c.code}>{c.name} (+{c.dial})</option>)}</select></label>
      <label className="min-w-0"><span className="sr-only">رقم الهاتف المحلي</span><input name="whatsapp" aria-label="رقم الهاتف المحلي" type="tel" dir="ltr" required maxLength={40} autoComplete="tel-national" placeholder={country==='EG'?'01012345678':country==='SA'?'0512345678':'رقم الهاتف'} className="system-input !mt-0 min-w-0" /></label>
    </div><p className="text-xs text-slate-500">اختر الدولة واكتب رقمك المحلي؛ نضيف كود الاتصال تلقائيًا للتواصل بشأن الاشتراك والحصص والواجبات.</p>
  </fieldset>
}
