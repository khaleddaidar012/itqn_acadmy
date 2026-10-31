export function whatsappNumber(value: unknown) {
  if (typeof value !== 'string' || value.length > 40) throw Error('أدخل رقم واتساب صحيحًا بكود الدولة')
  const normalized=value.trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[\s()-]/g,'').replace(/^00/,'+')
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw Error('أدخل رقم واتساب بكود الدولة مثل +201012345678')
  return normalized
}
