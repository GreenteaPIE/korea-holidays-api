// `/` 에 브라우저로 접속했을 때 보여주는 소개 페이지. 외부 리소스 없이 이 파일 하나로 동작한다.

export const LANDING_HTML = /* html */ `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Korea Holidays API</title>
<meta name="description" content="대한민국 공휴일·영업일 Open API — 대체공휴일·임시공휴일 지원, API 키 없이 JSON으로 바로 사용">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📅</text></svg>">
<style>
  :root {
    --bg: #f7f7f5; --surface: #ffffff; --text: #1d1d1f; --muted: #6e6e73; --border: #e3e3e0;
    --accent: #cd2e3a; --accent-soft: #fbeaeb; --blue: #0047a0; --code-bg: #f1f1ee;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #111113; --surface: #1c1c1f; --text: #f2f2f2; --muted: #a1a1a6; --border: #2e2e33;
      --accent: #ff5c66; --accent-soft: #3a1c1f; --blue: #6ea8ff; --code-bg: #232327; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 48px 16px 80px; }
  h1 { font-size: clamp(28px, 6vw, 40px); margin: 0 0 8px; letter-spacing: -0.02em; }
  h2 { font-size: 20px; margin: 48px 0 12px; }
  p { margin: 0 0 12px; }
  .lead { color: var(--muted); font-size: 17px; }
  .badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 24px; }
  .badge { font-size: 13px; padding: 4px 10px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
  .base { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13.5px; }
  .base code { background: var(--code-bg); padding: 8px 12px; border-radius: 8px; overflow-wrap: anywhere; flex: 1; min-width: 0; }
  button, .btn { font: inherit; font-size: 14px; border: 1px solid var(--border); background: var(--surface); color: var(--text);
    padding: 7px 14px; border-radius: 8px; cursor: pointer; text-decoration: none; display: inline-block; }
  button:hover, .btn:hover { border-color: var(--accent); color: var(--accent); }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn.primary:hover { opacity: 0.9; color: #fff; }
  .today { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
  .today .label { color: var(--muted); font-size: 13px; }
  .today .value { font-size: 22px; font-weight: 700; }
  .endpoint { border-top: 1px solid var(--border); padding: 14px 0; }
  .endpoint:first-child { border-top: 0; padding-top: 0; }
  .endpoint .row { display: flex; gap: 10px; align-items: center; justify-content: space-between; }
  .endpoint .row > div { min-width: 0; }
  .endpoint .row button { flex-shrink: 0; }
  .endpoint code { color: var(--blue); overflow-wrap: anywhere; }
  .endpoint .desc { color: var(--muted); font-size: 14px; margin-top: 2px; }
  pre.out { display: none; background: var(--code-bg); border-radius: 8px; padding: 12px; margin: 10px 0 0; overflow-x: auto; max-height: 320px; }
  pre.out.show { display: block; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  footer { margin-top: 56px; color: var(--muted); font-size: 14px; }
  footer a, .links a { color: var(--blue); }
</style>
</head>
<body>
<main>
  <h1>🇰🇷 Korea Holidays API</h1>
  <p class="lead">대한민국 공휴일·영업일 Open API. 대체공휴일·임시공휴일까지, API 키 없이 JSON으로 바로 사용하세요.</p>
  <div class="badges">
    <span class="badge">API 키 없음</span><span class="badge">대체·임시공휴일</span><span class="badge">영업일 계산</span>
    <span class="badge">연차 추천</span><span class="badge">캘린더 구독</span><span class="badge">CORS 허용</span>
  </div>

  <div class="card base">
    <code id="base"></code>
    <button type="button" data-copy="base">복사</button>
    <a class="btn primary" href="/docs">API 문서</a>
  </div>

  <h2>오늘</h2>
  <div class="today">
    <div class="card"><div class="label" id="today-label">오늘은</div><div class="value" id="today-value">불러오는 중…</div></div>
    <div class="card"><div class="label">다음 공휴일</div><div class="value" id="next-value">불러오는 중…</div></div>
  </div>

  <h2>바로 실행해 보기</h2>
  <div class="card" id="endpoints"></div>

  <h2>캘린더에 구독하기</h2>
  <div class="card">
    <p>구글 캘린더·아이폰 캘린더에 추가하면 대체공휴일과 임시공휴일이 자동으로 반영됩니다.</p>
    <div class="base"><code id="ics"></code><button type="button" data-copy="ics">복사</button></div>
    <div class="actions">
      <a class="btn" id="ics-google" target="_blank" rel="noopener">구글 캘린더에 추가</a>
      <a class="btn" id="ics-apple">애플 캘린더에 추가</a>
    </div>
  </div>

  <footer class="links">
    <a href="https://github.com/GreenteaPIE/korea-holidays-api">GitHub</a> ·
    <a href="https://www.npmjs.com/package/korea-holidays">npm</a> ·
    <a href="/openapi.json">OpenAPI</a>
    <p>관공서 공휴일 기준입니다. 민간 기업의 휴무 여부는 회사 규정에 따라 다를 수 있습니다.</p>
  </footer>
</main>
<script>
  const origin = location.origin
  const year = new Date(Date.now() + 9 * 3600e3).getUTCFullYear()
  document.getElementById('base').textContent = origin
  const ics = origin + '/calendar.ics'
  document.getElementById('ics').textContent = ics
  const webcal = ics.replace(/^https?:/, 'webcal:')
  document.getElementById('ics-apple').href = webcal
  document.getElementById('ics-google').href = 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(webcal)

  document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(document.getElementById(b.dataset.copy).textContent); b.textContent = '복사됨' }
    catch { b.textContent = '복사 실패' }
    setTimeout(() => (b.textContent = '복사'), 1500)
  }))

  const endpoints = [
    ['/holidays?year=' + year, year + '년 공휴일 목록'],
    ['/holidays/next?count=3', '다가오는 공휴일 3개 (D-day 포함)'],
    ['/holidays/check?date=' + year + '-10-09', '특정 날짜가 공휴일·영업일인지'],
    ['/business-days/add?date=' + year + '-09-23&days=3', '영업일 기준 3일 뒤'],
    ['/business-days/count?from=' + year + '-10-01&to=' + year + '-10-31', '10월 영업일 수'],
    ['/long-weekends?year=' + year, year + '년 3일 이상 연휴'],
    ['/vacation-tips?year=' + year + '&leaveDays=2', '연차 2일로 만드는 최장 휴가'],
  ]
  const list = document.getElementById('endpoints')
  for (const [path, desc] of endpoints) {
    const el = document.createElement('div')
    el.className = 'endpoint'
    el.innerHTML = '<div class="row"><div><code></code><div class="desc"></div></div><button type="button">실행</button></div><pre class="out"></pre>'
    el.querySelector('code').textContent = 'GET ' + path
    el.querySelector('.desc').textContent = desc
    const out = el.querySelector('pre')
    el.querySelector('button').addEventListener('click', async () => {
      out.classList.add('show')
      out.textContent = '요청 중…'
      try { out.textContent = JSON.stringify(await (await fetch(path)).json(), null, 2) }
      catch (e) { out.textContent = '요청 실패: ' + e.message }
    })
    list.appendChild(el)
  }

  ;(async () => {
    try {
      const today = await (await fetch('/holidays/check')).json()
      document.getElementById('today-label').textContent = '오늘 ' + today.date + ' (' + today.weekday + ')'
      document.getElementById('today-value').textContent = today.isHoliday ? '🎉 ' + today.holidays.map((h) => h.name).join(', ')
        : today.isWeekend ? '😴 주말' : '💼 영업일'
    } catch { document.getElementById('today-value').textContent = '-' }
    try {
      const [next] = (await (await fetch('/holidays/next')).json()).holidays
      document.getElementById('next-value').textContent = next ? next.name + ' · ' + (next.daysUntil === 0 ? '오늘' : 'D-' + next.daysUntil) : '-'
    } catch { document.getElementById('next-value').textContent = '-' }
  })()
</script>
</body>
</html>`
