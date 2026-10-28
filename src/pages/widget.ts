// `/widget` 쇼핑몰 출고일 위젯 소개와 코드 생성기. 위젯 본체는 public/widget.js.
import { BASE_CSS, GITHUB_URL, SITE_URL, head } from './layout.ts'

export function widgetHtml(): string {
  return /* html */ `<!doctype html>
<html lang="ko">
<head>
${head({
  title: '쇼핑몰 출고일 위젯 — "지금 주문하면 내일 출고" 자동 표시',
  description:
    '코드 두 줄로 쇼핑몰 상품 페이지에 "지금 주문하면 10/30(금) 출고"를 띄우세요. 주말·공휴일·대체공휴일을 자동으로 건너뛰는 무료 위젯입니다.',
  path: '/widget',
  image: '/og.png',
  keywords: '출고일 위젯, 배송 예정일, 당일 출고, 쇼핑몰 배송 안내, 스마트스토어 출고일, 공휴일 배송',
  jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: '쇼핑몰 출고일 위젯', url: SITE_URL + '/widget' },
})}
<style>
${BASE_CSS}
  .form { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; }
  label { display: grid; gap: 6px; font-size: 14px; color: var(--muted); font-weight: 600; }
  input, select { font: inherit; font-size: 15px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--surface); color: var(--text); color-scheme: light dark; }
  .preview { padding: 28px 20px; text-align: center; background: var(--code-bg); border-radius: 12px; margin-top: 16px; }
  pre { background: var(--code-bg); border-radius: 10px; padding: 14px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
  .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
</style>
</head>
<body>
<main>
  <p class="lead" style="font-size:14px"><a href="/">Korea Holidays API</a> › 출고일 위젯</p>
  <h1>🚚 쇼핑몰 출고일 위젯</h1>
  <p class="lead">코드 두 줄이면 상품 페이지에 <b>"지금 주문하면 10/30(금) 출고"</b>가 뜹니다. 주말·공휴일·대체공휴일은 알아서 건너뛰어요.</p>

  <div class="card">
    <div class="form">
      <label>당일 출고 마감<input type="time" id="cutoff" value="14:00"></label>
      <label>출고까지 (영업일)<input type="number" id="processing" value="0" min="0" max="30"></label>
      <label>도착까지 (영업일)<input type="number" id="delivery" value="1" min="0" max="30"></label>
      <label>출고하는 요일<select id="weekend"><option value="sat-sun">평일만</option><option value="sun">토요일도 출고</option></select></label>
    </div>
    <div class="preview" id="preview"></div>
  </div>

  <h2>설치 코드</h2>
  <div class="card">
    <div class="row"><span class="lead" style="margin:0">상품 페이지의 원하는 위치에 붙여넣으세요.</span><button type="button" id="copy">복사</button></div>
    <pre id="code"></pre>
  </div>

  <h2>문구 바꾸기</h2>
  <div class="card">
    <p><code>data-template</code> 에 원하는 문구를 넣으세요. <code>{ship}</code> 출고일, <code>{arrival}</code> 도착일, <code>{cutoff}</code> 마감 시각, <code>{remaining}</code> 마감까지 남은 시간으로 바뀝니다.</p>
    <pre>&lt;div data-kr-shipping data-template="오늘 {cutoff}까지 주문 시 {ship} 출발!"&gt;&lt;/div&gt;</pre>
    <p class="lead" style="font-size:14px;margin:0">기본 스타일이 필요 없으면 <code>data-plain</code> 을 넣으세요. 마감 시각이 지나면 1분 안에 자동으로 다음 출고일로 바뀝니다.</p>
  </div>

  <footer>무료로 쓰셔도 됩니다. 문의·제안은 <a href="${GITHUB_URL}/issues">GitHub</a> 로 주세요.</footer>
</main>
<script>
  const $ = (id) => document.getElementById(id)
  let n = 0
  function snippet() {
    const attrs = ['data-kr-shipping', 'data-cutoff="' + $('cutoff').value + '"']
    if (Number($('processing').value)) attrs.push('data-processing-days="' + Number($('processing').value) + '"')
    if ($('delivery').value !== '') attrs.push('data-delivery-days="' + Number($('delivery').value) + '"')
    if ($('weekend').value !== 'sat-sun') attrs.push('data-weekend="' + $('weekend').value + '"')
    return '<div ' + attrs.join(' ') + '></div>\\n<script src="' + location.origin + '/widget.js" async><' + '/script>'
  }
  function update() {
    const code = snippet()
    $('code').textContent = code
    // 실제 위젯 스크립트로 미리보기를 그린다
    $('preview').innerHTML = code.split('\\n')[0]
    const s = document.createElement('script')
    s.src = '/widget.js?preview=' + ++n
    document.body.appendChild(s)
  }
  for (const id of ['cutoff', 'processing', 'delivery', 'weekend']) $(id).addEventListener('change', update)
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('code').textContent); $('copy').textContent = '복사됨!' } catch {}
    setTimeout(() => ($('copy').textContent = '복사'), 1500)
  })
  update()
</script>
</body>
</html>`
}
