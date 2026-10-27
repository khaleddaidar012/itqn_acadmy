import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const stateHash = (value: string) => createHash('sha256').update(value).digest('hex')
function encryptionKey(value: string) {
  const key = Buffer.from(value, 'base64')
  if (key.length !== 32 || key.toString('base64') !== value) throw new Error('Zoom encryption key must be 32 bytes encoded as base64')
  return key
}
export function validEncryptionKey(value: string) { try { encryptionKey(value); return true } catch { return false } }
export function encryptTokens(value: { access_token: string; refresh_token: string }, key: string, userId: number) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(key), iv, { authTagLength: 16 })
  cipher.setAAD(Buffer.from('itqan-zoom:' + userId))
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.')
}
export function decryptTokens(value: string, key: string, userId: number): { access_token: string; refresh_token: string } {
  const [version, iv, tag, data, extra] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !data || extra) throw new Error('Invalid encrypted credentials')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(key), Buffer.from(iv, 'base64'), { authTagLength: 16 })
  decipher.setAAD(Buffer.from('itqan-zoom:' + userId)); decipher.setAuthTag(Buffer.from(tag, 'base64'))
  const parsed = JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8'))
  if (typeof parsed.access_token !== 'string' || typeof parsed.refresh_token !== 'string') throw new Error('Invalid credentials')
  return parsed
}
export function validWebhook(raw: string, timestamp: string | null, signature: string | null, secret: string, now = Date.now()) {
  if (!secret || !timestamp || !/^\d{10}$/.test(timestamp) || !signature || !/^v0=[a-f0-9]{64}$/.test(signature) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false
  const expected = 'v0=' + createHmac('sha256', secret).update(`v0:${timestamp}:${raw}`).digest('hex')
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
export function validationResponse(plainToken: string, secret: string) {
  return { plainToken, encryptedToken: createHmac('sha256', secret).update(plainToken).digest('hex') }
}
