const fs = require('node:fs')
fs.writeFileSync('src/lib/system/report-assets.json', JSON.stringify({
  font: fs.readFileSync('public/fonts/Amiri-Regular.ttf').toString('base64'),
  logo: fs.readFileSync('public/logo.png').toString('base64'),
}))
