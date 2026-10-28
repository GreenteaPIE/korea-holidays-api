// `/annual-leave` 입사일 기준 연차 개수 계산기. "연차 계산기 입사일" 검색으로 들어오는 사람을 위한 페이지.
import { BASE_CSS, GITHUB_URL, NPM_URL, SITE_URL, head, kakaoScript } from './layout.ts'

export function annualLeaveHtml(kakaoKey?: string): string {
  return /* html */ `<!doctype html>
<html lang="ko">
<head>
${head({
  title: '연차 계산기 (입사일 기준) — 내 연차 몇 개? 근로기준법 자동 계산',
  description:
    '입사일만 넣으면 지금 쓸 수 있는 연차, 다음 연차가 생기는 날, 근속 연수별 연차 일정을 근로기준법 기준으로 계산해 드려요. 1년 미만 월차도 포함됩니다.',
  path: '/annual-leave',
  image: '/og-annual-leave.png',
  keywords: '연차 계산기, 입사일 연차 계산, 연차 개수, 근로기준법 연차, 1년 미만 연차, 월차 계산, 연차 발생일, 근속 연차',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '연차 계산기 (입사일 기준)',
    url: SITE_URL + '/annual-leave',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    inLanguage: 'ko',
  },
})}
<style>
${BASE_CSS}
  .form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; align-items: end; }
  label { display: grid; gap: 6px; font-size: 14px; color: var(--muted); font-weight: 600; }
  input[type=date] { font: inherit; font-size: 16px; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--surface); color: var(--text); color-scheme: light dark; }
  .result { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 24px; }
  .stat .label { color: var(--muted); font-size: 14px; }
  .stat .value { font-size: 34px; font-weight: 800; letter-spacing: -0.02em; }
  .stat .value em { font-style: normal; color: var(--accent); }
  .stat .sub { color: var(--muted); font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; }
  th, td { text-align: left; padding: 10px 8px; border-top: 1px solid var(--border); }
  th { color: var(--muted); font-size: 13px; font-weight: 600; border-top: 0; }
  td.num { font-weight: 700; }
  tr.now td { background: var(--accent-soft); }
  tr.now td:first-child { border-radius: 8px 0 0 8px; }
  tr.now td:last-child { border-radius: 0 8px 8px 0; }
  .table-wrap { overflow-x: auto; }
  .cta { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px;
    background: linear-gradient(135deg, var(--accent-soft), var(--blue-soft)); border: 0; }
  .notes { color: var(--muted); font-size: 14px; padding-left: 18px; }
  .notes li { margin-bottom: 6px; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
</style>
</head>
<body>
<main>
  <p class="lead" style="font-size:14px"><a href="/">Korea Holidays API</a> › 연차 계산기</p>
  <h1>📅 연차 계산기 <span style="font-size:0.6em;color:var(--muted)">입사일 기준</span></h1>
  <p class="lead">입사일만 넣으면 근로기준법 기준으로 내 연차가 몇 개인지, 언제 또 생기는지 알려드려요.</p>

  <div class="card form">
    <label>입사일<input type="date" id="hire" required></label>
    <label>기준일<input type="date" id="asof"></label>
    <button type="button" class="primary" id="calc">계산하기</button>
  </div>

  <div id="out" hidden>
    <div class="result">
      <div class="card stat"><div class="label">지금 쓸 수 있는 연차</div><div class="value" id="current"></div><div class="sub" id="current-sub"></div></div>
      <div class="card stat"><div class="label">다음 연차</div><div class="value" id="next"></div><div class="sub" id="next-sub"></div></div>
      <div class="card stat"><div class="label">근속</div><div class="value" id="service"></div><div class="sub" id="service-sub"></div></div>
    </div>

    <a class="card cta" id="vacation-link" href="/vacation">
      <span><strong>🏖️ 이 연차로 최장 며칠 쉴 수 있을까?</strong><br><span class="lead" style="font-size:14px">대체공휴일까지 반영한 연차 꿀조합 계산기</span></span>
      <span class="btn primary">꿀조합 보기</span>
    </a>

    <h2>연차 일정</h2>
    <div class="card table-wrap">
      <table>
        <thead><tr><th>구분</th><th>생기는 날</th><th>일수</th><th>사용 기한</th></tr></thead>
        <tbody id="schedule"></tbody>
      </table>
    </div>
    <div class="actions"><button type="button" id="copy">결과 링크 복사</button><button type="button" id="kakao" data-kakao hidden>카카오톡 공유</button></div>
  </div>

  <h2>계산 기준</h2>
  <ul class="notes">
    <li><b>1년 미만</b>: 1개월 개근할 때마다 1일, 최대 11일 (근로기준법 제60조 제2항). 입사일로부터 1년 안에 써야 해요.</li>
    <li><b>1년 이상</b>: 1년간 80% 이상 출근하면 15일 (제60조 제1항).</li>
    <li><b>3년 이상</b>: 최초 1년을 넘는 근속 2년마다 1일씩 더해 최대 25일 (제60조 제4항).</li>
    <li>개근·출근율을 채웠다고 가정합니다. 상시 근로자 5명 미만 사업장에는 적용되지 않아요.</li>
    <li>회사가 <b>회계연도(1월 1일) 기준</b>으로 연차를 주면 일수와 생기는 날이 다를 수 있어요. 다만 퇴사할 때는 입사일 기준보다 불리하면 안 됩니다.</li>
  </ul>

  <h2>개발자이신가요?</h2>
  <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
    <span>같은 계산을 API 로 쓸 수 있어요: <code>/annual-leave?hireDate=2024-03-02</code></span>
    <span><a class="btn" href="/docs">API 문서</a> <a class="btn" href="${NPM_URL}">npm</a> <a class="btn" href="${GITHUB_URL}">GitHub</a></span>
  </div>

  <footer>법률 자문이 아닌 참고용 계산입니다. 정확한 연차는 회사 규정과 근로계약을 확인하세요.</footer>
</main>
<script>
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
  const $ = (id) => document.getElementById(id)
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)
  const params = new URLSearchParams(location.search)
  $('hire').value = /^\\d{4}-\\d{2}-\\d{2}$/.test(params.get('hire') || '') ? params.get('hire') : ''
  $('asof').value = /^\\d{4}-\\d{2}-\\d{2}$/.test(params.get('date') || '') ? params.get('date') : today

  const fmt = (s) => { const d = new Date(s + 'T00:00:00Z'); return s.replace(/-/g, '.') + ' (' + WEEKDAYS[d.getUTCDay()] + ')' }
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5)

  function shareUrl() {
    const q = new URLSearchParams({ hire: $('hire').value })
    if ($('asof').value !== today) q.set('date', $('asof').value)
    return location.origin + '/annual-leave?' + q
  }

  async function calc() {
    const hire = $('hire').value
    if (!hire) { $('hire').focus(); return }
    const res = await fetch('/annual-leave?' + new URLSearchParams({ hireDate: hire, date: $('asof').value || today }))
    const data = await res.json()
    if (!res.ok) { alert(data.error.message); return }
    history.replaceState(null, '', shareUrl().slice(location.origin.length))

    $('current').innerHTML = '<em>' + data.current.days + '일</em>'
    $('current-sub').textContent = (data.current.kind === 'monthly' ? '1년 미만 월차 누적 · ' : '') + fmt(data.current.expires) + '까지 사용'
    $('next').textContent = data.next.days + '일'
    $('next-sub').textContent = fmt(data.next.date) + '에 생겨요 (D-' + daysBetween(data.asOf, data.next.date) + ')'
    $('service').textContent = data.yearsOfService ? data.yearsOfService + '년' : '1년 미만'
    $('service-sub').textContent = fmt(data.hireDate) + ' 입사'

    const rows = []
    const monthly = data.schedule.filter((g) => g.kind === 'monthly')
    const monthlyNow = data.yearsOfService === 0
    rows.push('<tr class="' + (monthlyNow ? 'now' : '') + '"><td>1년 미만 (월차)</td><td>' + fmt(monthly[0].date) + ' ~ ' + fmt(monthly[10].date) +
      ' 매달</td><td class="num">1일씩 · 최대 11일</td><td>' + fmt(monthly[0].expires) + '</td></tr>')
    for (const g of data.schedule.filter((g) => g.kind === 'annual')) {
      const now = g.serviceYear === data.yearsOfService
      rows.push('<tr class="' + (now ? 'now' : '') + '"><td>근속 ' + g.serviceYear + '년' + (now ? ' (지금)' : '') + '</td><td>' + fmt(g.date) +
        '</td><td class="num">' + g.days + '일</td><td>' + fmt(g.expires) + '</td></tr>')
    }
    $('schedule').innerHTML = rows.join('')

    const year = Number(data.asOf.slice(0, 4))
    $('vacation-link').href = '/vacation?' + new URLSearchParams({ year: String(year + (Number(data.asOf.slice(5, 7)) >= 10 ? 1 : 0)), leave: String(Math.min(5, Math.max(1, data.current.days))) })
    $('out').hidden = false
  }

  $('calc').addEventListener('click', calc)
  for (const id of ['hire', 'asof']) $(id).addEventListener('change', () => $('hire').value && calc())
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(shareUrl()); $('copy').textContent = '복사됨!' } catch { prompt('링크를 복사하세요', shareUrl()) }
    setTimeout(() => ($('copy').textContent = '결과 링크 복사'), 1500)
  })
  $('kakao').addEventListener('click', () =>
    window.kakaoShare('내 연차는 ' + $('current').textContent + '!', '입사일만 넣으면 연차 개수를 알려주는 계산기', '/og-annual-leave.png', shareUrl()))
  if ($('hire').value) calc()
</script>
${kakaoScript(kakaoKey)}
</body>
</html>`
}
