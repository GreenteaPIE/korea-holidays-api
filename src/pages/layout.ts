// 브라우저용 페이지(소개, 연차 계산기)가 함께 쓰는 <head> 와 기본 스타일.

export const SITE_URL = 'https://korea-holidays-api.greenteapie2023.workers.dev'
export const GITHUB_URL = 'https://github.com/GreenteaPIE/korea-holidays-api'
export const NPM_URL = 'https://www.npmjs.com/package/korea-holidays'
export const PYPI_URL = 'https://pypi.org/project/korea-holidays/'

interface HeadOptions {
  title: string
  description: string
  path: string
  /** public/ 아래 1200x630 이미지 */
  image: string
  keywords: string
  jsonLd: Record<string, unknown>
}

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export function head({ title, description, path, image, keywords, jsonLd }: HeadOptions): string {
  const url = SITE_URL + path
  const imageUrl = SITE_URL + image
  const t = escapeAttr(title)
  const d = escapeAttr(description)
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<meta name="keywords" content="${escapeAttr(keywords)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Korea Holidays API">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${imageUrl}">
<meta name="theme-color" content="#cd2e3a">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📅</text></svg>">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
}

export const BASE_CSS = `
  :root {
    --bg: #f7f7f5; --surface: #ffffff; --text: #1d1d1f; --muted: #6e6e73; --border: #e3e3e0;
    --accent: #cd2e3a; --accent-soft: #fbeaeb; --blue: #0047a0; --blue-soft: #e6eef8; --code-bg: #f1f1ee;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #111113; --surface: #1c1c1f; --text: #f2f2f2; --muted: #a1a1a6; --border: #2e2e33;
      --accent: #ff5c66; --accent-soft: #3a1c1f; --blue: #6ea8ff; --blue-soft: #1a2638; --code-bg: #232327; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Malgun Gothic", "Noto Sans KR", sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 48px 16px 80px; }
  h1 { font-size: clamp(28px, 6vw, 40px); margin: 0 0 8px; letter-spacing: -0.02em; line-height: 1.25; }
  h2 { font-size: 20px; margin: 48px 0 12px; }
  p { margin: 0 0 12px; }
  .lead { color: var(--muted); font-size: 17px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13.5px; }
  button, .btn { font: inherit; font-size: 14px; border: 1px solid var(--border); background: var(--surface); color: var(--text);
    padding: 7px 14px; border-radius: 8px; cursor: pointer; text-decoration: none; display: inline-block; }
  button:hover, .btn:hover { border-color: var(--accent); color: var(--accent); }
  .btn.primary, button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn.primary:hover, button.primary:hover { opacity: 0.9; color: #fff; }
  footer { margin-top: 56px; color: var(--muted); font-size: 14px; }
  footer a { color: var(--blue); }
  a { color: var(--blue); }
  a.card { text-decoration: none; color: inherit; }
  /* button 의 display 지정이 hidden 속성을 덮어쓰지 않게 */
  [hidden] { display: none !important; }
`

/**
 * 카카오톡 공유. 카카오 개발자 콘솔에서 만든 JavaScript 키(wrangler.toml 의 KAKAO_JS_KEY)가 있을 때만 켜진다.
 * JavaScript 키는 등록한 도메인에서만 동작하는 공개 키라 페이지에 넣어도 된다.
 * SDK 버전을 바꿀 때는 https://developers.kakao.com/docs/latest/ko/javascript/download 의 integrity 값을 함께 넣는다.
 */
export function kakaoScript(key: string | undefined): string {
  if (!key) return ''
  return `<script src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js" crossorigin="anonymous"></script>
<script>
  try { Kakao.init(${JSON.stringify(key)}) } catch {}
  window.kakaoShare = (title, description, imagePath, url) => Kakao.Share.sendDefault({
    objectType: 'feed',
    content: { title, description, imageUrl: location.origin + imagePath, link: { mobileWebUrl: url, webUrl: url } },
    buttons: [{ title: '결과 보기', link: { mobileWebUrl: url, webUrl: url } }],
  })
  document.addEventListener('DOMContentLoaded', () => {
    if (window.Kakao && Kakao.isInitialized()) document.querySelectorAll('[data-kakao]').forEach((b) => (b.hidden = false))
  })
</script>`
}
