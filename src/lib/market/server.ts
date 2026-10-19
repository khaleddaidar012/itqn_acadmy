import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { countryMarket } from './policy'
export async function visitorMarket() {
  // Only Cloudflare's request metadata is authoritative. Ignore country headers,
  // query parameters, browser timezones and client-controlled region cookies.
  try {
    const context = await getCloudflareContext({ async: true })
    const market = countryMarket(context.cf?.country)
    if (market) return { ...market, source: 'cloudflare' }
  } catch { /* next dev has no real Cloudflare visitor metadata */ }
  if (process.env.NODE_ENV === 'development') {
    const market = countryMarket(process.env.ITQAN_DEV_COUNTRY)
    if (market) return { ...market, source: 'development' }
  }
  return null
}
