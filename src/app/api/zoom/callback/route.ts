import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/system/auth'
import { db, tokenHash } from '@/lib/system/db'
import { stateHash, encryptTokens } from '@/lib/zoom/security'
import { zoomConfiguration, exchangeCode, zoomProfile, revokeToken, ZoomProviderError } from '@/lib/zoom/client'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
export async function GET(request: NextRequest) {
  const { config } = zoomConfiguration()
  if (!config) return NextResponse.json({ error: 'تطبيق Zoom لم يُضبط بعد' }, { status: 503, headers })
  const user = await currentUser()
  if (!user || user.role !== 'teacher' || user.can_teach !== 1) return NextResponse.json({ error: 'سجّل الدخول بحساب المعلم الذي بدأ الربط' }, { status: 401, headers })
  const state = request.nextUrl.searchParams.get('state') || ''
  if (!/^[a-zA-Z0-9_-]{43}$/.test(state)) return NextResponse.json({ error: 'رابط ربط غير صحيح' }, { status: 400, headers })
  const consumed = await db().prepare('DELETE FROM zoom_oauth_states WHERE hash=? AND user_id=? AND session_hash=? AND expires>? RETURNING locale').get(stateHash(state),user.id,tokenHash(request.cookies.get('itqan_session')?.value || ''),Date.now())
  if (!consumed) return NextResponse.json({ error: 'انتهت صلاحية الربط أو سبق استخدامه. ابدأ مجددًا من الإعدادات.' }, { status: 400, headers })
  const redirect = (status: string) => NextResponse.redirect(new URL('/'+consumed.locale+'/dashboard?zoom='+status, config.redirectUri), { status: 303, headers })
  if (request.nextUrl.searchParams.has('error')) return redirect('cancelled')
  const code = request.nextUrl.searchParams.get('code') || ''
  if (!code || code.length > 4096) return redirect('failed')
  let token: string | undefined
  let stage = 'exchange'
  try {
    const tokens = await exchangeCode(config, code); token = tokens.access_token
    stage = 'profile'
    const profile = await zoomProfile(tokens.access_token)
    stage = 'storage'
    const saved = await db().prepare('INSERT INTO zoom_connections(user_id,zoom_user_id,account_id,email,encrypted_tokens,expires,connected) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET account_id=excluded.account_id,email=excluded.email,encrypted_tokens=excluded.encrypted_tokens,expires=excluded.expires,connected=excluded.connected WHERE zoom_connections.zoom_user_id=excluded.zoom_user_id RETURNING user_id').get(user.id,profile.id,profile.accountId,profile.email,encryptTokens(tokens,config.encryptionKey,user.id),Date.now()+tokens.expires_in*1000,new Date().toISOString())
    if(!saved) throw new Error('Zoom account changed during reauthorization')
    return redirect('connected')
  } catch (error) {
    const reason = error instanceof ZoomProviderError ? error.reason : stage === 'storage' ? 'storage' : 'connection'
    const status = error instanceof ZoomProviderError ? error.status : 0
    // Only bounded codes are retained. Never retain the authorization code, token, profile, or provider response.
    console.error('Zoom authorization failed', { stage, reason, status })
    try { await db().prepare('INSERT INTO system_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('zoom_last_error:'+user.id,JSON.stringify({ stage, reason, status, at: new Date().toISOString() })) } catch {}
    if (token) { try { await revokeToken(config, token) } catch { /* Do not log credentials or provider responses. */ } }
    return redirect('failed_' + reason)
  }
}
