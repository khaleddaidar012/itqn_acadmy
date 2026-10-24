import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { currentUser } from '@/lib/system/auth'
import { db, rateLimit, tokenHash } from '@/lib/system/db'
import { ServiceError, serviceError } from '@/lib/system/service-http'
import { zoomConfiguration, consentUrl, revokeToken } from '@/lib/zoom/client'
import { decryptTokens, stateHash } from '@/lib/zoom/security'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }
export async function GET() {
  try {
    const user = await currentUser(); if (!user) throw new ServiceError('سجّل الدخول أولًا', 401)
    if (user.role !== 'admin' && (user.role !== 'teacher' || user.can_teach !== 1)) throw new ServiceError('ربط Zoom متاح للمعلمين فقط', 403)
    const connection = await db().prepare('SELECT email,connected,expires FROM zoom_connections WHERE user_id=?').get(user.id)
    const { config } = zoomConfiguration()
    return NextResponse.json({ configured: !!config, canConnect: user.role === 'teacher', autoEndEnabled:process.env.ZOOM_AUTO_END==='1', connection: connection || null }, { headers })
  } catch (error) { return serviceError(error) }
}
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) throw new ServiceError('مصدر الطلب غير مسموح', 403)
    const user = await currentUser(); if (!user) throw new ServiceError('سجّل الدخول أولًا', 401)
    if (user.role !== 'teacher' || user.can_teach !== 1) throw new ServiceError('ربط Zoom متاح للمعلمين فقط', 403)
    if (!await rateLimit('zoom-connect:' + user.id)) throw new ServiceError('محاولات كثيرة. حاول لاحقًا.', 429)
    const { config } = zoomConfiguration(); if (!config) throw new ServiceError('تطبيق Zoom لم يُضبط بعد. راجع إدارة الأكاديمية.', 503)
    const raw = await request.text(); if (raw.length > 1024) throw new ServiceError('طلب كبير جدًا', 413)
    let body; try { body = JSON.parse(raw) } catch { throw new ServiceError('طلب غير صحيح') }
    if (!body || typeof body !== 'object') throw new ServiceError('طلب غير صحيح')
    if (body.action === 'connect' || body.action === 'reauthorize') {
      if (body.action==='connect' && await db().prepare('SELECT user_id FROM zoom_connections WHERE user_id=?').get(user.id)) throw new ServiceError('الحساب مربوط بالفعل؛ استخدم تحديث الصلاحيات أو افصله لتغييره.', 409)
      const state = randomBytes(32).toString('base64url')
      await db().batch([
        { sql: 'DELETE FROM zoom_oauth_states WHERE user_id=? OR expires<?', values: [user.id, Date.now()] },
        { sql: 'INSERT INTO zoom_oauth_states(hash,user_id,session_hash,locale,expires) VALUES(?,?,?,?,?)', values: [stateHash(state),user.id,tokenHash(request.cookies.get('itqan_session')?.value || ''),body.locale === 'en' ? 'en' : 'ar',Date.now()+10*60000] },
      ])
      return NextResponse.json({ url: consentUrl(config, state) }, { headers })
    }
    if (body.action === 'disconnect') {
      const connection = await db().prepare('SELECT encrypted_tokens FROM zoom_connections WHERE user_id=?').get(user.id)
      if (connection) {
        try { await revokeToken(config, decryptTokens(String(connection.encrypted_tokens),config.encryptionKey,user.id).access_token) }
        catch { throw new ServiceError('تعذر إلغاء التفويض في Zoom. حاول مجددًا أو أزل التطبيق من حساب Zoom.', 502) }
      }
      await db().batch([
        { sql: 'DELETE FROM zoom_connections WHERE user_id=?', values: [user.id] },
        { sql: 'DELETE FROM zoom_oauth_states WHERE user_id=?', values: [user.id] },
      ])
      return NextResponse.json({ ok: true }, { headers })
    }
    throw new ServiceError('عملية غير معروفة')
  } catch (error) { return serviceError(error) }
}
