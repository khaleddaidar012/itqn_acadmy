import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/system/db'
import { validWebhook, validationResponse } from '@/lib/zoom/security'
import { receiveMeetingEvent } from '@/lib/zoom/events'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  const secret = process.env.ZOOM_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'zoom_unavailable' }, { status: 503 })
  const raw = await request.text()
  if (raw.length > 65536) return NextResponse.json({ error: 'payload_too_large' }, { status: 413 })
  if (!validWebhook(raw,request.headers.get('x-zm-request-timestamp'),request.headers.get('x-zm-signature'),secret)) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  let body; try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'invalid_payload' }, { status: 400 }) }
  if (body?.event === 'endpoint.url_validation') {
    const plainToken = body.payload?.plainToken
    if (typeof plainToken !== 'string' || !plainToken || plainToken.length > 1024) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
    return NextResponse.json(validationResponse(plainToken,secret))
  }
  if (body?.event === 'app_deauthorized') {
    const payload = body.payload
    if (typeof payload?.user_id !== 'string' || !payload.user_id || typeof payload?.account_id !== 'string' || payload.client_id !== process.env.ZOOM_CLIENT_ID) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
    const disconnectedAt = Date.parse(payload.deauthorization_time)
    if (!Number.isFinite(disconnectedAt)) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
    // An old retried uninstall event must not remove a newer authorization.
    await db().prepare('DELETE FROM zoom_connections WHERE zoom_user_id=? AND account_id=? AND connected<=?').run(payload.user_id,payload.account_id,new Date(disconnectedAt).toISOString())
  }
  const diagnostic=await receiveMeetingEvent(body)
  if(diagnostic) await db().prepare('INSERT INTO system_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('zoom_webhook_last:'+diagnostic.event,JSON.stringify({...diagnostic,received:new Date().toISOString()}))
  return NextResponse.json({ ok: true })
}
