// `/en` English landing page for developers and people living in Korea.
import { BASE_CSS, GITHUB_URL, NPM_URL, PYPI_URL, SITE_URL, head } from './layout.ts'

export function enHtml(): string {
  return /* html */ `<!doctype html>
<html lang="en">
<head>
${head({
  title: 'Korean Public Holidays API — free, no API key',
  description:
    'Free JSON API for South Korean public holidays including substitute and temporary holidays. Business-day math, iCal feed, npm & PyPI packages and an MCP server for AI assistants.',
  path: '/en',
  image: '/og-en.png',
  keywords: 'korean public holidays api, south korea holidays 2027, korea business days, korean holidays json, substitute holidays korea, chuseok seollal dates',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    name: 'Korea Holidays API',
    description: 'South Korean public holidays and business days API',
    url: SITE_URL + '/en',
    documentation: SITE_URL + '/docs',
    isAccessibleForFree: true,
    inLanguage: 'en',
  },
})}
<link rel="alternate" hreflang="ko" href="${SITE_URL}/">
<link rel="alternate" hreflang="en" href="${SITE_URL}/en">
<style>
${BASE_CSS}
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Apple SD Gothic Neo", sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
  .grid .card strong { display: block; margin-bottom: 4px; }
  .grid .card span { color: var(--muted); font-size: 14px; }
  pre { background: var(--code-bg); border-radius: 10px; padding: 14px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; }
  td, th { text-align: left; padding: 8px; border-top: 1px solid var(--border); }
  th { border-top: 0; color: var(--muted); font-size: 13px; }
  td code { overflow-wrap: anywhere; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
</style>
</head>
<body>
<main>
  <p class="lead" style="font-size:14px"><a href="/">한국어</a> · English</p>
  <h1>🇰🇷 Korean Public Holidays API</h1>
  <p class="lead">Accurate South Korean public holidays — including substitute holidays, temporary holidays and election days — as free JSON. No sign-up, no API key.</p>
  <div class="actions">
    <a class="btn primary" href="/docs">API docs</a>
    <a class="btn" href="${GITHUB_URL}">GitHub</a>
    <a class="btn" href="${NPM_URL}">npm</a>
    <a class="btn" href="${PYPI_URL}">PyPI</a>
  </div>

  <h2>Why this API</h2>
  <div class="grid">
    <div class="card"><strong>Substitute holidays</strong><span>Korea moves holidays that fall on weekends — with different rules per holiday. This API applies them for you.</span></div>
    <div class="card"><strong>Verified weekly</strong><span>Every week the data is compared with the official KASI dataset; mismatches open a GitHub issue automatically.</span></div>
    <div class="card"><strong>2015 – 2027</strong><span>Including Labor Day and Constitution Day, which became public holidays in 2026.</span></div>
    <div class="card"><strong>Business days</strong><span>"3 business days from now", payday adjustment, Nth business day of a month.</span></div>
  </div>

  <h2>Quick start</h2>
  <pre>curl "${SITE_URL}/holidays?year=2027"</pre>
  <pre>{
  "year": 2027,
  "holidays": [
    { "date": "2027-01-01", "name": "신정", "nameEn": "New Year's Day", "type": "national" },
    { "date": "2027-02-06", "name": "설날 전날", "nameEn": "Day before Seollal", "type": "national" },
    ...
  ]
}</pre>

  <h2>Endpoints</h2>
  <div class="card" style="overflow-x:auto">
    <table>
      <tr><th>Endpoint</th><th>What it does</th></tr>
      <tr><td><code>/holidays?year=2027</code></td><td>Holidays of a year (filter by <code>month</code>, <code>type</code>)</td></tr>
      <tr><td><code>/holidays/check?date=2027-09-15</code></td><td>Is it a holiday / business day?</td></tr>
      <tr><td><code>/holidays/next?count=3</code></td><td>Upcoming holidays with days remaining</td></tr>
      <tr><td><code>/business-days/add?date=…&amp;days=3</code></td><td>Add (or subtract) business days</td></tr>
      <tr><td><code>/business-days/count?from=…&amp;to=…</code></td><td>Count business days in a range</td></tr>
      <tr><td><code>/business-days/adjust?date=…&amp;rule=previous</code></td><td>Move a payday off a holiday</td></tr>
      <tr><td><code>/business-days/nth?year=2027&amp;month=1&amp;n=-1</code></td><td>Nth (or last) business day of a month</td></tr>
      <tr><td><code>/long-weekends?year=2027</code></td><td>Long weekends</td></tr>
      <tr><td><code>/vacation-tips?year=2027&amp;leaveDays=2</code></td><td>Best days to take leave for the longest break</td></tr>
      <tr><td><code>/calendar.ics?lang=en</code></td><td>Subscribe in Google / Apple Calendar</td></tr>
    </table>
  </div>
  <p class="lead" style="font-size:14px">Options for business-day endpoints: <code>weekend=sun</code> (Saturday is a workday), <code>include=</code> extra days off, <code>exclude=</code> days you work anyway.</p>

  <h2>Calendar feed</h2>
  <div class="card">
    <p>Add this URL in Google Calendar → <em>Other calendars → From URL</em>. Holiday names are in English.</p>
    <pre>${SITE_URL}/calendar.ics?lang=en</pre>
  </div>

  <h2>Libraries</h2>
  <pre>npm install korea-holidays
pip install korea-holidays</pre>
  <pre>import { addBusinessDays, isHoliday } from 'korea-holidays'
isHoliday('2027-09-15')            // true (Chuseok)
addBusinessDays('2027-09-13', 2)   // '2027-09-20'</pre>

  <h2>For AI assistants (MCP)</h2>
  <div class="card">
    <p>Connect Claude or any MCP client so it stops guessing Korean holiday dates:</p>
    <pre>${SITE_URL}/mcp</pre>
    <p class="lead" style="font-size:14px;margin:0">Claude Code: <code>claude mcp add --transport http korea-holidays ${SITE_URL}/mcp</code></p>
  </div>

  <footer>Official government (public sector) holidays. Private companies may have their own days off. MIT licensed.</footer>
</main>
</body>
</html>`
}
