import { cookies } from 'next/headers'
import { db, safeUser, tokenHash } from './db'
export async function currentUser() {
  const token = (await cookies()).get('itqan_session')?.value
  if (!token) return undefined
  const session = await db().prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?').get(tokenHash(token), Date.now()) as { user_id: number } | undefined
  return session ? safeUser(session.user_id) : undefined
}
