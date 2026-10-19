import { NextRequest } from 'next/server'
import { db, tokenHash } from '@/lib/system/db'
import { reportPdf } from '@/lib/system/report-pdf'
import type { StudentReport } from '@/lib/system/student-report'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }
  if (!/^[a-f0-9]{64}$/.test(token)) return new Response('التقرير غير متاح', { status: 404, headers })
  const row = await db().prepare('SELECT snapshot FROM report_shares WHERE token_hash=? AND revoked=0 AND expires>?').get(tokenHash(token), new Date().toISOString())
  if (!row) return new Response('التقرير غير متاح أو انتهت صلاحية الرابط', { status: 404, headers })
  const pdf = reportPdf(JSON.parse(String(row.snapshot)) as StudentReport)
  return new Response(pdf, { headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="itqan-student-report.pdf"' } })
}
