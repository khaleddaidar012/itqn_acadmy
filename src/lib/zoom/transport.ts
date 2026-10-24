import { randomUUID } from 'node:crypto'
import { decryptTokens, encryptTokens } from './security.ts'
import type { ZoomConfig } from './client'
export type ZoomDatabase = { prepare(sql:string): { get(...values:(string|number|null)[]):Promise<Record<string,string|number|null>|undefined>; run(...values:(string|number|null)[]):Promise<unknown>; all(...values:(string|number|null)[]):Promise<Record<string,string|number|null>[]> } }
export class ZoomTransportError extends Error { status:number; constructor(message:string,status=502){super(message);this.status=status} }
type Connection = { user_id: number; zoom_user_id: string; account_id: string; encrypted_tokens: string; expires: number }
function credentialHeader(config: ZoomConfig) { return 'Basic '+Buffer.from(config.clientId+':'+config.clientSecret).toString('base64') }
export async function teacherToken(teacherId: number, config: ZoomConfig, force = false, database: ZoomDatabase, fetcher: typeof fetch = fetch) {
  const read = () => database.prepare('SELECT * FROM zoom_connections WHERE user_id=?').get(teacherId) as Promise<Connection | undefined>
  let connection = await read()
  if (!connection) throw new ZoomTransportError('على المعلم ربط حساب Zoom من الإعدادات أولًا.',409)
  const previous = connection.encrypted_tokens
  if (!force && connection.expires > Date.now()+120000) return { connection, token:decryptTokens(previous,config.encryptionKey,teacherId).access_token }
  const owner = randomUUID()
  const lock = await database.prepare('INSERT INTO zoom_refresh_locks(user_id,owner,expires) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET owner=excluded.owner,expires=excluded.expires WHERE zoom_refresh_locks.expires<? RETURNING owner').get(teacherId,owner,Date.now()+30000,Date.now())
  if (!lock) throw new ZoomTransportError('جارٍ تحديث اتصال Zoom. أعد المحاولة بعد ثوانٍ.',409)
  try {
    connection = await read()
    if (!connection) throw new ZoomTransportError('انقطع ربط Zoom. أعد الربط من الإعدادات.',409)
    if (connection.encrypted_tokens !== previous || !force && connection.expires > Date.now()+120000) return {connection,token:decryptTokens(connection.encrypted_tokens,config.encryptionKey,teacherId).access_token}
    const tokens = decryptTokens(connection.encrypted_tokens,config.encryptionKey,teacherId)
    const response = await fetcher('https://zoom.us/oauth/token',{method:'POST',headers:{Authorization:credentialHeader(config),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:tokens.refresh_token}).toString(),signal:AbortSignal.timeout(15000),cache:'no-store',redirect:'manual'})
    if (!response.ok) throw new ZoomTransportError('تعذر تجديد اتصال Zoom. أعد الربط من الإعدادات.',409)
    const next = await response.json()
    if (!next.access_token || typeof next.access_token !== 'string' || !next.refresh_token || typeof next.refresh_token !== 'string' || !Number.isFinite(next.expires_in) || next.expires_in<=0) throw new ZoomTransportError('استجابة تجديد Zoom غير مكتملة. أعد الربط.',502)
    const encrypted = encryptTokens(next,config.encryptionKey,teacherId)
    const saved = await database.prepare('UPDATE zoom_connections SET encrypted_tokens=?,expires=? WHERE user_id=? AND encrypted_tokens=? RETURNING user_id').get(encrypted,Date.now()+next.expires_in*1000,teacherId,connection.encrypted_tokens)
    if (!saved) throw new ZoomTransportError('تغير ربط المعلم أثناء الطلب. أعد المحاولة.',409)
    return {connection:{...connection,encrypted_tokens:encrypted},token:next.access_token as string}
  } finally { await database.prepare('DELETE FROM zoom_refresh_locks WHERE user_id=? AND owner=?').run(teacherId,owner) }
}
export async function callZoom(teacherId: number, config: ZoomConfig, path: string, init: RequestInit = {}, database: ZoomDatabase, fetcher: typeof fetch = fetch) {
  let auth = await teacherToken(teacherId,config,false,database,fetcher)
  const request = (token:string) => fetcher('https://api.zoom.us/v2'+path,{...init,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),cache:'no-store',redirect:'manual'})
  let response = await request(auth.token)
  if (response.status===401) { auth=await teacherToken(teacherId,config,true,database,fetcher); response=await request(auth.token) }
  return {response,connection:auth.connection}
}
