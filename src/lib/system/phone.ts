import {isSupportedCountry,parsePhoneNumberFromString,type CountryCode} from 'libphonenumber-js'
export function nationalWhatsapp(value:unknown,country:unknown) {
  if(typeof country!=='string'||!isSupportedCountry(country))throw Error('اختر دولة رقم واتساب')
  if(typeof value!=='string'||value.length>40)throw Error('أدخل رقم واتساب صحيحًا')
  const normalized=value.trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[\s()-]/g,'').replace(/^00/,'+')
  if(!/^\+?\d+$/.test(normalized))throw Error('أدخل رقم الهاتف دون أحرف')
  const phone=parsePhoneNumberFromString(normalized,country as CountryCode)
  if(!phone||!phone.isPossible()||phone.country!==country)throw Error('رقم واتساب غير صحيح للدولة المختارة')
  return phone.number
}
export function whatsappNumber(value: unknown) {
  if (typeof value !== 'string' || value.length > 40) throw Error('أدخل رقم واتساب صحيحًا بكود الدولة')
  const normalized=value.trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[\s()-]/g,'').replace(/^00/,'+')
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw Error('أدخل رقم واتساب بكود الدولة مثل +201012345678')
  return normalized
}
