const fs = require('node:fs')
const config = JSON.parse(fs.readFileSync('wrangler.jsonc', 'utf8'))
if (!config.account_id || !/^[a-f0-9]{32}$/.test(config.account_id)) {
  console.error('Pin the verified target Cloudflare account_id in wrangler.jsonc before remote migration or deployment.')
  process.exit(1)
}
const id = config.d1_databases?.find(binding => binding.binding === 'DB')?.database_id
if (!id || id === '00000000-0000-0000-0000-000000000000') {
  console.error('Set the real Cloudflare D1 database_id in wrangler.jsonc before remote migration or deployment.')
  process.exit(1)
}
