// 공유 미리보기(Open Graph) 이미지 생성: node scripts/og/generate.cjs
// Playwright(Chromium)가 필요하다. 결과는 public/og.png, public/og-vacation.png (1200x630).
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

const fontDir = path.join(__dirname, '../../node_modules/pretendard/dist/public/static')
// setContent 페이지(about:blank)에서는 file:// 폰트를 못 읽으므로 data URL 로 넣는다
const font = (weight, file) => {
  const data = fs.readFileSync(path.join(fontDir, file)).toString('base64')
  return `@font-face { font-family: P; font-weight: ${weight}; src: url("data:font/otf;base64,${data}"); }`
}

const base = `
  ${font(500, 'Pretendard-Medium.otf')}
  ${font(700, 'Pretendard-Bold.otf')}
  ${font(800, 'Pretendard-ExtraBold.otf')}
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; font-family: P; background: #fbfaf7; color: #1d1d1f; position: relative; overflow: hidden; }
  .bar { position: absolute; left: 0; top: 0; bottom: 0; width: 18px; background: linear-gradient(#cd2e3a 50%, #0047a0 50%); }
  .wrap { position: absolute; inset: 0 0 0 18px; padding: 72px 80px; display: flex; gap: 56px; align-items: center; }
  .text { flex: 1; }
  .eyebrow { font-size: 26px; font-weight: 700; color: #cd2e3a; letter-spacing: 0.02em; }
  h1 { font-size: 76px; font-weight: 800; line-height: 1.08; letter-spacing: -0.03em; margin: 14px 0 22px; }
  p { font-size: 30px; font-weight: 500; color: #55555a; line-height: 1.45; }
  .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 30px; }
  .chip { font-size: 22px; font-weight: 700; padding: 8px 16px; border-radius: 999px; background: #fbeaeb; color: #cd2e3a; }
  .url { position: absolute; right: 80px; bottom: 44px; font-size: 22px; font-weight: 500; color: #8e8e93; }
  .cal { width: 380px; background: #fff; border: 2px solid #ececea; border-radius: 28px; padding: 26px; box-shadow: 0 12px 40px rgba(0,0,0,.06); }
  .cal .title { font-size: 26px; font-weight: 800; margin-bottom: 14px; }
  .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; text-align: center; }
  .grid div { font-size: 20px; font-weight: 700; padding: 8px 0; border-radius: 10px; }
  .grid .h { color: #8e8e93; font-size: 16px; padding: 0 0 4px; }
  .grid .sun, .grid .off { color: #cd2e3a; }
  .grid .sat { color: #0047a0; }
  .grid .off { background: #fbeaeb; }
  .grid .leave { background: #0047a0; color: #fff; }
`

function calendar(title, year, month, marks) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells = ['일', '월', '화', '수', '목', '금', '토'].map((d) => `<div class="h">${d}</div>`)
  for (let i = 0; i < first; i++) cells.push('<div></div>')
  for (let d = 1; d <= days; d++) {
    const dow = (first + d - 1) % 7
    const cls = marks[d] ?? (dow === 0 ? 'sun' : dow === 6 ? 'sat' : '')
    cells.push(`<div class="${cls}">${d}</div>`)
  }
  return `<div class="cal"><div class="title">${title}</div><div class="grid">${cells.join('')}</div></div>`
}

const pages = {
  'og.png': `
    <div class="bar"></div>
    <div class="wrap">
      <div class="text">
        <div class="eyebrow">OPEN API · npm · PyPI</div>
        <h1>대한민국<br>공휴일·영업일 API</h1>
        <p>대체공휴일·임시공휴일까지<br>API 키 없이 JSON으로 바로</p>
        <div class="chips"><span class="chip">영업일 계산</span><span class="chip">연차 추천</span><span class="chip">캘린더 구독</span></div>
      </div>
      ${calendar('2026년 10월', 2026, 10, { 3: 'off', 4: 'off', 5: 'off', 9: 'off', 10: 'off', 11: 'off' })}
    </div>
    <div class="url">korea-holidays-api.greenteapie2023.workers.dev</div>`,
  'og-vacation.png': `
    <div class="bar"></div>
    <div class="wrap">
      <div class="text">
        <div class="eyebrow">연차 꿀조합 계산기</div>
        <h1>연차 2일로<br>9일 쉬기</h1>
        <p>2027 추석, 월·금 연차면<br>9/11 ~ 9/19 최장 연휴</p>
        <div class="chips"><span class="chip">대체공휴일 반영</span><span class="chip">토요일 근무 옵션</span><span class="chip">회사 휴일 추가</span></div>
      </div>
      ${calendar('2027년 9월', 2027, 9, { 11: 'off', 12: 'off', 13: 'leave', 14: 'off', 15: 'off', 16: 'off', 17: 'leave', 18: 'off', 19: 'off' })}
    </div>
    <div class="url">연차 계산기 · /vacation</div>`,
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  for (const [file, body] of Object.entries(pages)) {
    await page.setContent(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${base}</style></head><body>${body}</body></html>`)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: path.join(__dirname, '../../public', file) })
    console.log('wrote public/' + file)
  }
  await browser.close()
})()
