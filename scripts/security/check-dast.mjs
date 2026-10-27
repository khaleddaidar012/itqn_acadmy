import fs from 'node:fs'

const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
if (!Array.isArray(report.site) || !report.site.length) throw Error('ZAP did not report a scanned site')
for (const site of report.site) {
  const target = new URL(site['@name'])
  if (!['127.0.0.1', 'localhost'].includes(target.hostname)) throw Error('Unexpected scan target')
  if (!Array.isArray(site.alerts)) throw Error('Incomplete ZAP report')
}
const alerts = report.site.flatMap(site => site.alerts)
const high = alerts.filter(alert => Number(alert.riskcode) >= 3)
console.log(JSON.stringify({ scanner: 'OWASP ZAP', alerts: alerts.length, highRisk: high.map(alert => ({ rule: alert.pluginid, name: alert.name })) }))
if (high.length) process.exitCode = 1
