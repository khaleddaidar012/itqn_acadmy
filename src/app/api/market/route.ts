import { NextRequest, NextResponse } from 'next/server'
import { visitorMarket } from '@/lib/market/server'
import { EGYPT_PROGRAMS, INTL_PROGRAMS } from '@/data/pricing'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'CDN-Cache-Control': 'no-store', 'Cloudflare-CDN-Cache-Control': 'no-store', Vary: '*' }
export async function GET() {
  const market = await visitorMarket()
  if (!market) return NextResponse.json({ error: 'country_unavailable' }, { status: 503, headers })
  return NextResponse.json({ ...market, programs: market.region === 'EG' ? EGYPT_PROGRAMS : INTL_PROGRAMS }, { headers })
}
export async function POST(request: NextRequest) {
  const market = await visitorMarket()
  if (!market) return NextResponse.json({ error: 'country_unavailable' }, { status: 503, headers })
  let input: { plan_id?: unknown }; try { input = await request.json() } catch { return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers }) }
  if (!input || typeof input !== 'object' || typeof input.plan_id !== 'string') return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers })
  const programs = market.region === 'EG' ? EGYPT_PROGRAMS : INTL_PROGRAMS
  const program = programs.find(p => p.plans.some(plan => plan.id === input.plan_id))
  const plan = program?.plans.find(p => p.id === input.plan_id)
  if (!plan) return NextResponse.json({ error: 'plan_unavailable_for_country' }, { status: 400, headers })
  return NextResponse.json({ ...market, plan }, { headers })
}
