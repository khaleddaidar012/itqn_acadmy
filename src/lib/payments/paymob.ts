import { createHmac, timingSafeEqual } from 'node:crypto'

export type PaymobConfig = { secretKey: string; publicKey: string; hmacSecret: string; integrationIds: number[]; mode: 'test' | 'live'; appUrl: string }
export function paymobConfig(env = process.env): PaymobConfig | null {
  const mode = env.PAYMOB_MODE
  const secretKey = env.PAYMOB_SECRET_KEY || ''; const publicKey = env.PAYMOB_PUBLIC_KEY || ''; const hmacSecret = env.PAYMOB_HMAC_SECRET || ''
  const raw = env.PAYMOB_USD_INTEGRATION_IDS || ''
  if (!['test','live'].includes(mode || '') || env.PAYMOB_USD_ENABLED !== '1' || !hmacSecret || !/^\d+(,\d+)*$/.test(raw)) return null
  if (!secretKey.startsWith(`sk_${mode}_`) || !publicKey.startsWith(`pk_${mode}_`)) return null
  const integrationIds = raw.split(',').map(Number)
  if (integrationIds.some(id => !Number.isSafeInteger(id) || id < 1)) return null
  try {
    const url = new URL(env.ITQAN_APP_URL || '')
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || /^(localhost|127\.|\[::1\])/.test(url.hostname)) return null
    return { mode: mode as 'test' | 'live', secretKey, publicKey, hmacSecret, integrationIds, appUrl: url.origin }
  } catch { return null }
}

type ObjectValue = Record<string, unknown>
export const hmacFields = ['amount_cents','created_at','currency','error_occured','has_parent_transaction','id','integration_id','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment','is_voided','order.id','owner','pending','source_data.pan','source_data.sub_type','source_data.type','success'] as const
export function transactionSignatureInput(obj: ObjectValue) {
  return hmacFields.map(path => {
    const value = path.split('.').reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as ObjectValue)[key] : undefined, obj)
    // This integration is for card transaction callbacks. Unknown/null signing
    // fields fail closed until their representation is verified with Paymob.
    if (!['boolean','number','string'].includes(typeof value)) throw new Error('Invalid transaction signing field')
    return String(value)
  }).join('')
}
export function verifyTransaction(obj: ObjectValue, signature: string, secret: string) {
  if (!secret || !/^[a-fA-F0-9]{128}$/.test(signature)) return false
  try { return timingSafeEqual(Buffer.from(createHmac('sha512', secret).update(transactionSignatureInput(obj)).digest('hex'), 'hex'), Buffer.from(signature, 'hex')) } catch { return false }
}

export type IntentionInput = { id: string; amount: number; planName: string; firstName: string; lastName: string; email: string; phone: string; country: string; city: string; address: string; locale: string }
export async function createIntention(config: PaymobConfig, input: IntentionInput) {
  const response = await fetch('https://accept.paymob.com/v1/intention/', {
    method: 'POST', headers: { Authorization: `Token ${config.secretKey}`, 'Content-Type':'application/json' }, signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ amount: input.amount, currency:'USD', payment_methods:config.integrationIds, special_reference:input.id, expiration:3600,
      items:[{name:input.planName,amount:input.amount,quantity:1}],
      billing_data:{ first_name:input.firstName,last_name:input.lastName,email:input.email,phone_number:input.phone,country:input.country,city:input.city,street:input.address,building:'NA',floor:'NA',apartment:'NA',state:input.city },
      notification_url:config.appUrl+'/api/payments/paymob/webhook', redirection_url:config.appUrl+'/'+input.locale+'/payment-result?order='+encodeURIComponent(input.id),
    }),
  })
  if (!response.ok) throw new Error('Paymob rejected intention')
  const data = await response.json()
  if (typeof data.id !== 'string' || typeof data.client_secret !== 'string' || !Number.isSafeInteger(data.intention_order_id) || data.intention_order_id < 1) throw new Error('Invalid Paymob response')
  const url = new URL('https://accept.paymob.com/unifiedcheckout/')
  url.searchParams.set('publicKey',config.publicKey); url.searchParams.set('clientSecret',data.client_secret)
  return { intentionId:data.id, providerOrderId:String(data.intention_order_id), checkoutUrl:url.toString() }
}
