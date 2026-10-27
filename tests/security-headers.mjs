import assert from 'node:assert/strict'

const origin = process.env.SECURITY_TEST_ORIGIN || 'http://127.0.0.1:3000'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Use an isolated loopback target')
let previous
for (const path of ['/ar/login', '/ar/login', '/en/login', '/ar']) {
  const response = await fetch(origin + path, { headers: { 'x-nonce': 'attacker-chosen-nonce', 'Content-Security-Policy': "script-src 'nonce-attacker-chosen-nonce'" } })
  assert.equal(response.status, 200)
  const policy = response.headers.get('content-security-policy') || ''
  const nonce = policy.match(/script-src[^;]*'nonce-([^']+)'/)?.[1]
  assert.ok(nonce && nonce !== previous && nonce !== 'attacker-chosen-nonce', 'Fresh server-controlled nonce per document')
  assert.equal(Buffer.from(nonce, 'base64').length, 16)
  assert.ok(!policy.match(/script-src[^;]*(unsafe-inline|unsafe-eval)/), 'Production scripts must not permit inline/eval bypasses')
  assert.match(response.headers.get('cache-control') || '', /no-store/)
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('x-powered-by'), null)
  const html = await response.text()
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)]
  assert.ok(scripts.length > 0)
  for (const [, attributes] of scripts) assert.ok(attributes.includes(`nonce="${nonce}"`), 'Rendered scripts must agree with CSP, including the theme script')
  previous = nonce
}
console.log('PASS: production HTML uses fresh, unspoofable nonces; rendered scripts match CSP; HTML is not cached; security headers present')
