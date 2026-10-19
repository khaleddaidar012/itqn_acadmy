import { NextRequest, NextResponse } from 'next/server'
import { paymobConfig, verifyTransaction } from '@/lib/payments/paymob'
import { PaymentError, recordTransaction } from '@/lib/payments/service'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request: NextRequest) {
  const config=paymobConfig()
  if(!config) return NextResponse.json({error:'payments_unavailable'},{status:503})
  try {
    const raw=await request.text(); if(raw.length>65536) return NextResponse.json({error:'payload_too_large'},{status:413})
    let body; try {body=JSON.parse(raw)} catch {return NextResponse.json({error:'invalid_payload'},{status:400})}
    // Card-token callbacks are deliberately discarded; we never save or use tokens.
    if(body?.type === 'TOKEN') return NextResponse.json({ok:true,ignored:true})
    if(body?.type !== 'TRANSACTION' || !body.obj || typeof body.obj !== 'object') return NextResponse.json({error:'unsupported_callback'},{status:400})
    if(!verifyTransaction(body.obj,request.nextUrl.searchParams.get('hmac') || '',config.hmacSecret)) return NextResponse.json({error:'invalid_signature'},{status:401})
    await recordTransaction(body.obj,config)
    return NextResponse.json({ok:true})
  } catch(error) {return NextResponse.json({error:error instanceof PaymentError?error.message:'callback_processing_failed'},{status:error instanceof PaymentError?error.status:500})}
}
