const arabicCountries = new Set(['EG','SA','AE','KW','QA','BH','OM','JO','PS','LB','SY','IQ','YE','SD','LY','TN','DZ','MA','MR','SO','DJ','KM'])
export function countryMarket(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Z]{2}$/.test(value) || ['XX','ZZ'].includes(value)) return null
  return { country: value, region: value === 'EG' ? 'EG' as const : 'INTL' as const, currency: value === 'EG' ? 'EGP' as const : 'USD' as const, locale: arabicCountries.has(value) ? 'ar' as const : 'en' as const }
}
