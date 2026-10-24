import { validEncryptionKey } from './security'
export type ZoomConfig = { clientId: string; clientSecret: string; redirectUri: string; encryptionKey: string; webhookSecret: string }
export class ZoomProviderError extends Error {
  reason: string
  status: number
  constructor(reason: string, status = 0) { super(reason); this.reason = reason; this.status = status }
}
export function zoomConfiguration(env = process.env) {
  const config = { clientId: env.ZOOM_CLIENT_ID || '', clientSecret: env.ZOOM_CLIENT_SECRET || '', redirectUri: env.ZOOM_REDIRECT_URI || '', encryptionKey: env.ZOOM_TOKEN_ENCRYPTION_KEY || '', webhookSecret: env.ZOOM_WEBHOOK_SECRET || '' }
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key)
  try {
    const url = new URL(config.redirectUri)
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/api/zoom/callback' || !(url.protocol === 'https:' || env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) missing.push('validRedirectUri')
  } catch { missing.push('validRedirectUri') }
  if (!validEncryptionKey(config.encryptionKey)) missing.push('validEncryptionKey')
  return { config: missing.length ? null : config, missing }
}
function basic(config: ZoomConfig) { return 'Basic ' + Buffer.from(config.clientId + ':' + config.clientSecret).toString('base64') }
// Workers supports manual redirects. Reject non-2xx responses below so credentials
// are never forwarded to a redirect destination.
export function consentUrl(config: ZoomConfig, state: string) {
  const url = new URL('https://zoom.us/oauth/authorize')
  url.search = new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri, state }).toString()
  return url.toString()
}
export async function exchangeCode(config: ZoomConfig, code: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher('https://zoom.us/oauth/token', { method: 'POST', headers: { Authorization: basic(config), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri }), signal: AbortSignal.timeout(15000), cache: 'no-store', redirect: 'manual' })
  if (!response.ok) throw new ZoomProviderError('token_exchange', response.status)
  const data = await response.json()
  if (typeof data.access_token !== 'string' || !data.access_token || typeof data.refresh_token !== 'string' || !data.refresh_token || typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new ZoomProviderError('token_response')
  return { access_token: data.access_token as string, refresh_token: data.refresh_token as string, expires_in: data.expires_in as number }
}
export async function zoomProfile(token: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher('https://api.zoom.us/v2/users/me', { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000), cache: 'no-store', redirect: 'manual' })
  if (!response.ok) throw new ZoomProviderError('profile_fetch', response.status)
  const data = await response.json()
  if (typeof data.id !== 'string' || !data.id) throw new ZoomProviderError('profile_id')
  if (typeof data.email !== 'string' || !data.email) throw new ZoomProviderError('profile_email')
  if (typeof data.account_id !== 'string' || !data.account_id) throw new ZoomProviderError('profile_account')
  return { id: data.id as string, email: data.email as string, accountId: data.account_id as string }
}
export async function revokeToken(config: ZoomConfig, token: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher('https://zoom.us/oauth/revoke', { method: 'POST', headers: { Authorization: basic(config), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }), signal: AbortSignal.timeout(15000), cache: 'no-store', redirect: 'manual' })
  if (!response.ok) throw new Error('Zoom revocation failed')
}
