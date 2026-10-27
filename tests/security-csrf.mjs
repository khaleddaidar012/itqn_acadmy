import assert from 'node:assert/strict'

const origin = process.env.SECURITY_CSRF_ORIGIN || 'http://localhost:3000'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Synthetic loopback target only')
const post = (body, cookie = '', source = origin, type = 'application/json') => fetch(origin + '/api/system', {
  method: 'POST', headers: { 'Content-Type': type, Cookie: cookie, ...(source === undefined ? {} : { Origin: source }) },
  body: type === 'application/json' ? JSON.stringify(body) : new URLSearchParams(body),
})
const login = await post({ action: 'login', email: process.env.ITQAN_ADMIN_EMAIL, password: process.env.ITQAN_ADMIN_PASSWORD })
assert.equal(login.status, 200)
const cookie = login.headers.get('set-cookie')?.split(';')[0]
assert.ok(cookie)
const state = async () => (await (await fetch(origin + '/api/system', { headers: { Cookie: cookie } })).json()).users.map(user => user.id)
try {
  const before = await state()
  const change = { action: 'createUser', role: 'teacher', name: 'Blocked CSRF probe', email: 'csrf-probe@test.invalid', password: 'isolated-csrf-test-password', rate: 0, currency: 'EGP' }
  for (const source of ['https://attacker.invalid', 'null', origin + '.attacker.invalid']) assert.equal((await post(change, cookie, source)).status, 403)
  const missing = await fetch(origin + '/api/system', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(change) })
  assert.equal(missing.status, 403)
  assert.equal((await post(change, cookie, 'https://attacker.invalid', 'application/x-www-form-urlencoded')).status, 403)
  assert.deepEqual(await state(), before, 'Rejected cross-origin requests must not mutate authenticated data')
  for (const path of ['/Copy%20(2)%20of%20icon.png', '/Copy%20(2)%20of%20logo.png', '/Copy%20(2)%20of%20robots.txt']) assert.equal((await fetch(origin + path)).status, 404, 'Unknown locale/file must return a real 404')
  console.log('PASS: missing, foreign and null Origins rejected with an authenticated session; simple-form CSRF rejected; no mutations; backup lookalikes return 404')
} finally {
  await post({ action: 'logout' }, cookie)
}
