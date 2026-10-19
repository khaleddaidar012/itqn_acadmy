import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from './auth'
import { allowed, type Permission } from './permissions'
export class ServiceError extends Error { constructor(message: string, public status = 400) { super(message) } }
export async function authorize(permission: Permission, request?: NextRequest) {
  if (request && request.headers.get('origin') !== request.nextUrl.origin) throw new ServiceError('مصدر الطلب غير مسموح', 403)
  const user = await currentUser()
  if (!user) throw new ServiceError('سجّل الدخول أولًا', 401)
  if (!allowed(user, permission)) throw new ServiceError('ليس لديك الصلاحية المطلوبة', 403)
  return user
}
export function serviceError(error: unknown) {
  if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error('Academy service failed', error instanceof Error ? error.message : 'Unknown')
  return NextResponse.json({ error: 'تعذر تنفيذ الطلب. تحقق من إعدادات الخدمة وحاول مجددًا.' }, { status: 500 })
}
