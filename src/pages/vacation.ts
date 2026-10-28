// `/vacation` 연차 꿀조합 계산기. 개발자가 아닌 사람도 쓰는 페이지라, 결과를 공유하기 쉽게 만든다.
import { BASE_CSS, GITHUB_URL, NPM_URL, SITE_URL, head } from './layout.ts'

export interface VacationPageConfig {
  years: number[]
  defaultYear: number
  provisional: number[]
}

export function vacationHtml(config: VacationPageConfig): string {
  const year = config.defaultYear
  return /* html */ `<!doctype html>
<html lang="ko">
<head>
${head({
  title: `${year} 연차 꿀조합 계산기 — 연차 며칠로 최장 며칠 쉴까?`,
  description: `${year}년 대체공휴일·임시공휴일까지 반영해서, 연차 N일로 만들 수 있는 가장 긴 휴가를 계산해 드려요. 토요일 근무, 회사 휴일도 반영됩니다.`,
  path: '/vacation',
  image: '/og-vacation.png',
  keywords: `${year} 연차 꿀조합, 연차 계산기, ${year} 황금연휴, ${year} 공휴일, 대체공휴일, 연차 추천, 징검다리 연휴`,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '연차 꿀조합 계산기',
    url: SITE_URL + '/vacation',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    inLanguage: 'ko',
  },
})}
<style>
${BASE_CSS}
  .controls { display: grid; gap: 18px; }
  .field > .label { font-size: 14px; color: var(--muted); margin-bottom: 8px; font-weight: 600; }
  .seg { display: flex; flex-wrap: wrap; gap: 6px; }
  .seg button { min-width: 52px; }
  .seg button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
  .custom { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .custom input { font: inherit; font-size: 14px; padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--surface); color: var(--text); color-scheme: light dark; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .chip { font-size: 13px; padding: 3px 10px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
  button.chip { border: 0; }
  .summary { font-size: clamp(20px, 4.5vw, 26px); font-weight: 800; letter-spacing: -0.02em; margin: 36px 0 4px; line-height: 1.4; }
  .summary em { font-style: normal; color: var(--accent); }
  .note { color: var(--muted); font-size: 14px; }
  .tips { display: grid; gap: 12px; margin-top: 16px; }
  /* 날짜 띠가 길어도 카드가 화면 밖으로 늘어나지 않고 띠만 가로로 스크롤되게 */
  .tip { min-width: 0; }
  .tip .top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .tip .range { font-size: 18px; font-weight: 700; }
  .tip .days { font-size: 28px; font-weight: 800; color: var(--accent); white-space: nowrap; }
  .tip .meta { color: var(--muted); font-size: 14px; margin: 2px 0 10px; }
  .strip { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 4px; }
  .day { flex: 0 0 44px; text-align: center; border-radius: 8px; padding: 6px 0; font-size: 12px; background: var(--code-bg); }
  .day b { display: block; font-size: 16px; }
  .day.weekend { background: var(--blue-soft); color: var(--blue); }
  .day.holiday { background: var(--accent-soft); color: var(--accent); }
  .day.leave { background: var(--blue); color: #fff; }
  .legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; color: var(--muted); margin-top: 12px; }
  .legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
  .share { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 20px; }
  .weekends { display: grid; gap: 6px; }
  .weekends div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border); font-size: 15px; }
  .weekends div:first-child { border-top: 0; }
  .weekends span { color: var(--muted); text-align: right; }
  .dev { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
</style>
</head>
<body>
<main>
  <p class="note"><a href="/">Korea Holidays API</a> › 연차 계산기</p>
  <h1>🏖️ 연차 꿀조합 계산기</h1>
  <p class="lead">대체공휴일·임시공휴일까지 반영해서, 연차로 만들 수 있는 가장 긴 휴가를 찾아드려요.</p>

  <div class="card controls">
    <div class="field"><div class="label">연도</div><div class="seg" id="year"></div></div>
    <div class="field"><div class="label">쓸 수 있는 연차</div><div class="seg" id="leave"></div></div>
    <div class="field"><div class="label">근무 형태</div><div class="seg" id="weekend"></div></div>
    <div class="field">
      <div class="label">회사 휴일 (창립기념일 등)</div>
      <div class="custom"><input type="date" id="custom-date" aria-label="회사 휴일 날짜"><button type="button" id="custom-add">추가</button></div>
      <div class="chips" id="custom-list"></div>
    </div>
  </div>

  <p class="summary" id="summary">계산 중…</p>
  <p class="note" id="provisional" hidden>⚠️ 아직 정부의 임시공휴일 발표 전이라 바뀔 수 있어요.</p>
  <div class="legend">
    <span><i style="background:var(--blue)"></i>연차</span>
    <span><i style="background:var(--accent-soft)"></i>공휴일</span>
    <span><i style="background:var(--blue-soft)"></i>주말</span>
  </div>
  <div class="tips" id="tips"></div>
  <div class="share">
    <button type="button" class="primary" id="share">결과 공유하기</button>
    <button type="button" id="copy">링크 복사</button>
  </div>

  <h2 id="weekends-title">연차 없이 쉬는 연휴</h2>
  <div class="card weekends" id="weekends"></div>

  <h2>개발자이신가요?</h2>
  <div class="card dev">
    <span>이 계산기는 무료 공휴일 API 로 만들었어요. 서비스에 그대로 가져다 쓰세요.</span>
    <span><a class="btn" href="/docs">API 문서</a> <a class="btn" href="${NPM_URL}">npm</a> <a class="btn" href="${GITHUB_URL}">GitHub</a></span>
  </div>

  <footer>관공서 공휴일 기준입니다. 회사마다 휴무일이 다를 수 있어요.</footer>
</main>
<script>
  const CONFIG = ${JSON.stringify(config)}
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
  const params = new URLSearchParams(location.search)
  const state = {
    year: CONFIG.years.includes(Number(params.get('year'))) ? Number(params.get('year')) : CONFIG.defaultYear,
    leave: Math.min(5, Math.max(1, Number(params.get('leave')) || 2)),
    weekend: params.get('weekend') === 'sun' ? 'sun' : 'sat-sun',
    include: (params.get('include') || '').split(',').filter((d) => /^\\d{4}-\\d{2}-\\d{2}$/.test(d)),
  }

  const $ = (id) => document.getElementById(id)
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const parse = (s) => new Date(s + 'T00:00:00Z')
  const fmt = (s) => { const d = parse(s); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '(' + WEEKDAYS[d.getUTCDay()] + ')' }

  function segment(el, options, key) {
    el.innerHTML = ''
    for (const [value, label] of options) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = label
      b.setAttribute('aria-pressed', String(state[key] === value))
      b.addEventListener('click', () => { state[key] = value; render() })
      el.appendChild(b)
    }
  }

  function query() {
    const q = new URLSearchParams({ year: state.year, weekend: state.weekend })
    if (state.include.length) q.set('include', state.include.join(','))
    return q
  }

  function shareUrl() {
    const q = new URLSearchParams({ year: state.year, leave: state.leave })
    if (state.weekend !== 'sat-sun') q.set('weekend', state.weekend)
    if (state.include.length) q.set('include', state.include.join(','))
    return location.origin + '/vacation?' + q
  }

  const holidayCache = {}
  async function holidayDates(year) {
    if (!(year in holidayCache)) {
      const res = await fetch('/holidays?year=' + year)
      holidayCache[year] = res.ok ? new Set((await res.json()).holidays.map((h) => h.date)) : new Set()
    }
    return holidayCache[year]
  }

  async function strip(tip) {
    const leave = new Set(tip.leaveDates)
    const cells = []
    for (let d = parse(tip.start); d <= parse(tip.end); d = new Date(d.getTime() + 864e5)) {
      const key = d.toISOString().slice(0, 10)
      const dow = d.getUTCDay()
      const holidays = await holidayDates(d.getUTCFullYear())
      const kind = leave.has(key) ? 'leave'
        : holidays.has(key) || state.include.includes(key) ? 'holiday'
        : dow === 0 || (dow === 6 && state.weekend === 'sat-sun') ? 'weekend' : ''
      cells.push('<div class="day ' + kind + '"><b>' + d.getUTCDate() + '</b>' + WEEKDAYS[dow] + '</div>')
    }
    return '<div class="strip">' + cells.join('') + '</div>'
  }

  let seq = 0
  async function render() {
    segment($('year'), CONFIG.years.map((y) => [y, y + '년']), 'year')
    segment($('leave'), [1, 2, 3, 4, 5].map((n) => [n, n + '일']), 'leave')
    segment($('weekend'), [['sat-sun', '주 5일'], ['sun', '토요일 근무']], 'weekend')
    $('custom-list').innerHTML = ''
    for (const date of state.include) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'chip'
      b.textContent = fmt(date) + ' ✕'
      b.setAttribute('aria-label', fmt(date) + ' 회사 휴일 삭제')
      b.addEventListener('click', () => { state.include = state.include.filter((d) => d !== date); render() })
      $('custom-list').appendChild(b)
    }
    history.replaceState(null, '', shareUrl().slice(location.origin.length))
    $('provisional').hidden = !CONFIG.provisional.includes(state.year)
    $('weekends-title').textContent = state.year + '년 연차 없이 쉬는 연휴'

    const mine = ++seq
    $('summary').textContent = '계산 중…'
    try {
      const q = query()
      const [tipsRes, weekendsRes] = await Promise.all([
        fetch('/vacation-tips?' + q + '&leaveDays=' + state.leave + '&limit=5'),
        fetch('/long-weekends?' + q),
      ])
      if (!tipsRes.ok || !weekendsRes.ok) throw new Error('요청 실패')
      const { tips } = await tipsRes.json()
      const { longWeekends } = await weekendsRes.json()
      const stripHtml = await Promise.all(tips.map(strip))
      if (mine !== seq) return

      const best = tips[0]
      $('summary').innerHTML = best
        ? state.year + '년, 연차 <em>' + best.leaveDates.length + '일</em>이면 최장 <em>' + best.days + '일</em> 쉴 수 있어요'
        : '추천할 조합이 없어요'
      $('tips').innerHTML = tips.map((t, i) =>
        '<div class="card tip"><div class="top"><span class="range">' + ['🥇', '🥈', '🥉', '4위', '5위'][i] + ' ' + fmt(t.start) + ' ~ ' + fmt(t.end) +
        '</span><span class="days">' + t.days + '일</span></div>' +
        '<div class="meta">연차 ' + t.leaveDates.length + '일 (' + t.leaveDates.map(fmt).join(', ') + ') · 연차 1일당 ' + t.efficiency + '일 · ' +
        esc(t.holidays.join(', ')) + '</div>' + stripHtml[i] + '</div>').join('')
      $('weekends').innerHTML = longWeekends.length
        ? longWeekends.map((w) => '<div><b>' + fmt(w.start) + ' ~ ' + fmt(w.end) + ' · ' + w.days + '일</b><span>' + esc(w.holidays.join(', ')) + '</span></div>').join('')
        : '<div>3일 이상 이어지는 연휴가 없어요</div>'
    } catch (e) {
      if (mine === seq) $('summary').textContent = '계산하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
    }
  }

  $('custom-add').addEventListener('click', () => {
    const v = $('custom-date').value
    if (v && !state.include.includes(v)) { state.include = [...state.include, v].sort(); render() }
  })

  async function copyLink(button) {
    try { await navigator.clipboard.writeText(shareUrl()); button.textContent = '복사됨!' }
    catch { prompt('링크를 복사하세요', shareUrl()) }
    setTimeout(() => (button.textContent = '링크 복사'), 1500)
  }
  $('copy').addEventListener('click', () => copyLink($('copy')))
  $('share').addEventListener('click', async () => {
    const text = $('summary').textContent
    if (navigator.share) {
      try { await navigator.share({ title: state.year + ' 연차 꿀조합 계산기', text, url: shareUrl() }) } catch {}
    } else copyLink($('copy'))
  })

  render()
</script>
</body>
</html>`
}
