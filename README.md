# 🇰🇷 Korea Holidays API

[![npm version](https://img.shields.io/npm/v/korea-holidays?color=cb3837&logo=npm)](https://www.npmjs.com/package/korea-holidays)
[![npm downloads](https://img.shields.io/npm/dm/korea-holidays?color=cb3837)](https://www.npmjs.com/package/korea-holidays)
[![bundle size](https://img.shields.io/bundlephobia/minzip/korea-holidays)](https://bundlephobia.com/package/korea-holidays)
[![Test & Deploy](https://github.com/GreenteaPIE/korea-holidays-api/actions/workflows/deploy.yml/badge.svg)](https://github.com/GreenteaPIE/korea-holidays-api/actions/workflows/deploy.yml)
[![Verify Holiday Data](https://github.com/GreenteaPIE/korea-holidays-api/actions/workflows/verify-data.yml/badge.svg)](https://github.com/GreenteaPIE/korea-holidays-api/actions/workflows/verify-data.yml)
[![PyPI version](https://img.shields.io/pypi/v/korea-holidays?color=3775a9&logo=pypi&logoColor=white)](https://pypi.org/project/korea-holidays/)
[![license](https://img.shields.io/npm/l/korea-holidays)](LICENSE)

대한민국 공휴일·영업일 Open API & 라이브러리 — 대체공휴일·임시공휴일·연차 추천·캘린더 구독까지, API 키 없이 바로 사용

**🔗 API 주소:** https://korea-holidays-api.greenteapie2023.workers.dev  
**📖 문서(Swagger):** https://korea-holidays-api.greenteapie2023.workers.dev/docs  
**🏖️ 연차 꿀조합:** https://korea-holidays-api.greenteapie2023.workers.dev/vacation · **📅 연차 개수 계산기:** https://korea-holidays-api.greenteapie2023.workers.dev/annual-leave  
**🤖 MCP:** `https://korea-holidays-api.greenteapie2023.workers.dev/mcp` · **🌏 English:** https://korea-holidays-api.greenteapie2023.workers.dev/en  
**📦 npm:** [`korea-holidays`](https://www.npmjs.com/package/korea-holidays) · **🐍 PyPI:** [`korea-holidays`](https://pypi.org/project/korea-holidays/)

- **API 키 없음** · 회원가입 없이 바로 호출
- **대체공휴일·임시공휴일·선거일 포함** · 2026년부터 공휴일이 된 노동절·제헌절 반영
- **영업일 계산** · "영업일 기준 N일 뒤", "기간 내 영업일 수", 토요일 영업·회사 휴일 옵션
- **급여일·정산일** · "급여일이 휴일이면 전 영업일", "매달 5번째 영업일", "마지막 영업일"
- **연차 개수** · 입사일 기준 근로기준법 계산 (1년 미만 월차 포함)
- **쇼핑몰 출고일 위젯** · 코드 두 줄로 "지금 주문하면 10/30(금) 출고"
- **AI 비서 연결 (MCP)** · Claude 등이 한국 공휴일을 추측하지 않고 정확히 계산
- **연휴·연차 추천** · "연차 2일로 최장 9일 휴가"
- **캘린더 구독** · 구글·애플 캘린더에 URL 하나로 추가
- **npm·PyPI 패키지** · 서버 없이 코드에서 바로 계산 (의존성 0개)
- **구글 시트 함수** · `=KR_ADDBUSINESSDAYS(A2, 3)` 처럼 코드 없이
- **CORS 허용** · 브라우저에서 바로 `fetch` 가능

## 지원 연도

| 연도 | 상태 |
|---|---|
| 2015 ~ 2026 | 확정 (공공데이터포털 특일정보와 대조 완료) |
| 2027 | 잠정 (임시공휴일 등 공식 발표에 따라 바뀔 수 있음, 응답의 `provisional: true`) |

## 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/holidays?year=2026` | 연도별 공휴일 목록 (`month`, `type`, `observances` 필터) |
| GET | `/holidays/check?date=2026-10-09` | 특정 날짜의 공휴일·영업일 여부 (`date` 생략 시 오늘) |
| GET | `/holidays/next?count=3` | 다가오는 공휴일과 D-day |
| GET | `/business-days/add?date=2026-09-23&days=3` | 영업일 기준 N일 뒤(음수면 앞) 날짜 |
| GET | `/business-days/count?from=2026-10-01&to=2026-10-31` | 기간 내 영업일 수 (양 끝 포함) |
| GET | `/long-weekends?year=2026` | 3일 이상 연휴 목록 |
| GET | `/vacation-tips?year=2027&leaveDays=2` | 연차로 만들 수 있는 최장 휴가 추천 |
| GET | `/calendar.ics` | 캘린더 구독용 iCalendar |
| GET | `/business-days/adjust?date=2026-10-25&rule=previous` | 휴일이면 앞/뒤 영업일로 (급여일·결제일) |
| GET | `/business-days/nth?year=2026&month=10&n=5` | 그 달의 N번째 영업일 (`n=-1` 마지막) |
| GET | `/business-days/month?year=2026&month=10` | 그 달의 영업일 목록 |
| GET | `/annual-leave?hireDate=2024-03-02` | 입사일 기준 연차 개수 |
| GET | `/shipping-date?cutoff=14:00&deliveryDays=1` | 지금 주문하면 언제 출고·도착? |
| POST | `/mcp` | MCP 서버 (AI 비서용) |
| GET | `/years` | 지원 연도 목록 |
| GET | `/docs` · `/openapi.json` | Swagger UI · OpenAPI 3.0 스펙 |

### 예시

```bash
curl "https://korea-holidays-api.greenteapie2023.workers.dev/holidays/check?date=2026-07-17"
```

```json
{
  "date": "2026-07-17",
  "weekday": "금",
  "kind": "holiday",
  "isWeekend": false,
  "isHoliday": true,
  "isBusinessDay": false,
  "holidays": [
    { "date": "2026-07-17", "name": "제헌절", "nameEn": "Constitution Day", "type": "national" }
  ]
}
```

```bash
curl "https://korea-holidays-api.greenteapie2023.workers.dev/vacation-tips?year=2027&leaveDays=2&limit=1"
```

```json
{
  "year": 2027,
  "provisional": true,
  "leaveDays": 2,
  "tips": [
    {
      "start": "2027-09-11",
      "end": "2027-09-19",
      "days": 9,
      "holidays": ["추석 전날", "추석", "추석 다음날"],
      "leaveDates": ["2027-09-13", "2027-09-17"],
      "efficiency": 4.5
    }
  ]
}
```

2027년 추석(9/14~16, 화~목) 앞뒤로 월·금요일에 연차를 쓰면 9일을 쉽니다.

### 영업일 옵션

`/holidays/check`, `/business-days/*`, `/long-weekends`, `/vacation-tips`, `/shipping-date` 에서 함께 쓸 수 있습니다.

| 파라미터 | 예시 | 설명 |
|---|---|---|
| `weekend` | `sat-sun`(기본) · `sun` · `none` | 휴무 요일. `sun` 은 토요일 영업 업종용 |
| `include` | `2026-03-15,2026-12-31` | 추가로 쉬는 날 (회사 창립기념일 등) |
| `exclude` | `2026-05-01` | 주말·공휴일이어도 일하는 날 (노동절 출근 등) |

```bash
# 토요일도 영업하는 가게의 '영업일 기준 3일 뒤'
curl "https://korea-holidays-api.greenteapie2023.workers.dev/business-days/add?date=2026-09-23&days=3&weekend=sun"
```

### 공휴일 `type`

| 값 | 의미 |
|---|---|
| `national` | 법정 공휴일 |
| `substitute` | 대체공휴일 |
| `temporary` | 임시공휴일 |
| `election` | 선거일 |
| `observance` | 기념일 (어버이날·스승의 날 등, 쉬지 않음). `observances=true` 일 때만 포함 |

### 급여일 규칙 (`rule`)

| 값 | 의미 | 예: 2026-02-28(토) |
|---|---|---|
| `previous` (기본) | 앞 영업일 | 2/27(금) |
| `next` | 뒤 영업일 | 3/3(화) (3/1 삼일절·3/2 대체공휴일 건너뜀) |
| `modified-next` | 뒤로 가다 달이 바뀌면 앞으로 (금융권 관행) | 2/27(금) |
| `modified-previous` | 앞으로 가다 달이 바뀌면 뒤로 | - |

## 🤖 AI 비서 연결 (MCP)

Claude 같은 AI 비서는 한국 대체공휴일을 자주 틀립니다. MCP 로 연결하면 이 API 로 정확히 계산합니다.

```
https://korea-holidays-api.greenteapie2023.workers.dev/mcp
```

- **Claude (claude.ai / 데스크톱 앱)**: 설정 → 커넥터 → 커스텀 커넥터 추가 → 위 URL
- **Claude Code**:
  ```bash
  claude mcp add --transport http korea-holidays https://korea-holidays-api.greenteapie2023.workers.dev/mcp
  ```

도구: `get_holidays`, `check_date`, `next_holidays`, `add_business_days`, `count_business_days`, `adjust_to_business_day`, `nth_business_day`, `long_weekends`, `vacation_tips`, `annual_leave`, `shipping_date`

> "2027년에 연차 3일로 제일 길게 쉬려면?", "다음 달 마지막 영업일 언제야?", "2024년 3월 입사면 지금 연차 몇 개?" 같은 질문에 도구를 써서 답합니다.

## 🚚 쇼핑몰 출고일 위젯

상품 페이지에 붙여넣으면 "🚚 지금 주문하면 **오늘 10/28(수)** 출고 · 10/29(목) 도착 예정 (마감까지 1시간 39분)" 이 뜹니다.

```html
<div data-kr-shipping data-cutoff="14:00" data-delivery-days="1"></div>
<script src="https://korea-holidays-api.greenteapie2023.workers.dev/widget.js" async></script>
```

코드 생성기와 미리보기: https://korea-holidays-api.greenteapie2023.workers.dev/widget

## 📅 캘린더 구독

구글 캘린더 → **다른 캘린더 +** → **URL로 추가** 에 아래 주소를 넣으면 됩니다. 아이폰은 `webcal://` 로 바꿔서 열면 구독됩니다.

```
https://korea-holidays-api.greenteapie2023.workers.dev/calendar.ics
```

| 파라미터 | 예시 | 설명 |
|---|---|---|
| `lang` | `en` | 일정 이름을 영어로 |
| `observances` | `true` | 기념일도 표시 |
| `include` / `includeName` | `2026-03-15` / `창립기념일` | 회사 휴일 추가 |
| `exclude` | `2026-05-01` | 표시에서 뺄 날짜 |

## 📦 npm 패키지

서버를 거치지 않고 코드에서 바로 계산할 수 있습니다. 의존성이 없고 ESM 과 TypeScript 타입을 제공합니다.

```bash
npm install korea-holidays
```

```ts
import { addBusinessDays, adjustToBusinessDay, annualLeave, isHoliday, nextHolidays, nthBusinessDay, vacationTips } from 'korea-holidays'

isHoliday('2026-07-17') // true (제헌절)
addBusinessDays('2026-09-23', 3) // '2026-09-30'
addBusinessDays('2026-09-23', 3, { weekend: 'sun' }) // 토요일 영업
nextHolidays(new Date(), 3) // 오늘부터 다가오는 공휴일 3개 (daysUntil 포함)
vacationTips(2027, 2)[0] // { start: '2027-09-11', end: '2027-09-19', days: 9, ... }
adjustToBusinessDay('2026-10-25') // '2026-10-23' (급여일이 일요일 → 금요일)
nthBusinessDay(2026, 12, -1) // '2026-12-31' (마지막 영업일)
annualLeave('2024-03-02').current // { days: 15, kind: 'annual', expires: ... }
```

날짜는 `'YYYY-MM-DD'` 문자열 또는 `Date` 를 받으며, `Date` 는 **한국 시간 기준 날짜**로 해석합니다. 지원 연도 밖이면 `OutOfRangeError`, 형식이 틀리면 `InvalidDateError` 를 던집니다.

## 🐍 Python 패키지

```bash
pip install korea-holidays
```

```python
import korea_holidays as kh

kh.is_holiday("2026-07-17")             # True (제헌절)
kh.add_business_days("2026-09-23", 3)   # date(2026, 9, 30)
kh.vacation_tips(2027, leave_days=2)[0] # 2027-09-11 ~ 09-19, 9일
```

함수 목록과 옵션은 [`python/README.md`](python/README.md) 를 참고하세요. npm 패키지와 같은 데이터·같은 계산 결과를 냅니다.

## 📊 구글 시트 함수

구글 시트 **확장 프로그램 → Apps Script** 에 [`integrations/google-sheets/Code.gs`](integrations/google-sheets/Code.gs) 를 붙여넣으면 바로 쓸 수 있습니다.

```
=KR_ISHOLIDAY(A2)                         → TRUE / FALSE
=KR_ADDBUSINESSDAYS("2026-09-23", 3)      → 2026-09-30
=KR_BUSINESSDAYS("2026-10-01", "2026-10-31") → 20
=KR_ADJUSTBUSINESSDAY("2026-10-25")       → 2026-10-23 (급여일 조정)
=KR_NTHBUSINESSDAY(2026, 12, -1)          → 2026-12-31 (마지막 영업일)
=KR_HOLIDAYS(2026)                        → 공휴일 표
```

자세한 설치 방법은 [`integrations/google-sheets/README.md`](integrations/google-sheets/README.md) 에 있습니다.

## 💬 슬랙 알림 예시

GitHub Actions 스케줄로 "내일은 공휴일" 알림을 보낼 수 있습니다 (`SLACK_WEBHOOK_URL` 시크릿 필요).

```yaml
on:
  schedule:
    - cron: '0 9 * * *' # 매일 18:00 KST
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - run: |
          tomorrow=$(TZ=Asia/Seoul date -d tomorrow +%F)
          name=$(curl -s "https://korea-holidays-api.greenteapie2023.workers.dev/holidays/check?date=$tomorrow" | jq -r '.holidays[0].name // empty')
          [ -n "$name" ] && curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"📅 내일($tomorrow)은 $name 입니다\"}" "${{ secrets.SLACK_WEBHOOK_URL }}" || true
```

## 에러 응답

```json
{ "error": { "code": "OUT_OF_RANGE", "message": "2030년 데이터는 아직 지원하지 않습니다. 지원 연도: 2024, 2025, 2026, 2027" } }
```

| 코드 | HTTP | 의미 |
|---|---|---|
| `INVALID_PARAMETER` | 400 | 파라미터 형식 오류 |
| `OUT_OF_RANGE` | 400 | 지원하지 않는 연도 |
| `NOT_FOUND` | 404 | 없는 경로 |
| `RATE_LIMITED` | 429 | IP 당 분당 120회 초과 |

## 🙋 데이터 오류 제보

빠졌거나 잘못된 공휴일, 새 임시공휴일은 [📅 공휴일 데이터 오류 제보](https://github.com/GreenteaPIE/korea-holidays-api/issues/new?template=holiday-data.yml) 양식으로 알려주세요.
매주 공공데이터포털 특일정보와 자동으로 대조하며, 다르면 이슈가 자동으로 생기고 해결되면 자동으로 닫힙니다.

## 개발

```bash
npm install
npm run dev        # http://localhost:8787
npm test
npm run typecheck
npm run build      # npm 패키지 빌드 (dist/)
npm run export:python  # src/data 를 고친 뒤 Python 패키지 데이터 갱신
node scripts/og/generate.cjs  # 공유 미리보기 이미지(public/og*.png) 다시 만들기
```

공휴일 데이터의 원본은 [`src/data/holidays.ts`](src/data/holidays.ts) 하나입니다. Python 패키지 데이터는 여기서 생성하며, 둘이 다르면 테스트가 실패합니다.

## 자동화 (GitHub Actions)

| 워크플로 | 시점 | 하는 일 | 필요한 Secrets |
|---|---|---|---|
| [Test & Deploy](.github/workflows/deploy.yml) | `main` 푸시, PR | 테스트 후 Cloudflare Workers 배포 (PR 은 테스트만) | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| [Verify Holiday Data](.github/workflows/verify-data.yml) | 매주 월요일 09:17 (KST) | 공공데이터포털 특일정보와 비교해 다르면 이슈 생성 | `DATA_GO_KR_SERVICE_KEY` |
| [Python](.github/workflows/python.yml) | `python/`·데이터 변경 | Python 3.9·3.13 테스트 | - |
| [Publish to npm](.github/workflows/publish-npm.yml) | GitHub Release 발행 | npm 에 `korea-holidays` 배포 | 없음 (Trusted Publishing) |
| [Publish to PyPI](.github/workflows/publish-pypi.yml) | GitHub Release 발행 | PyPI 에 `korea-holidays` 배포 | 없음 (Trusted Publishing) |

- `DATA_GO_KR_SERVICE_KEY`: [공공데이터포털 한국천문연구원 특일 정보](https://www.data.go.kr/data/15012690/openapi.do) 활용신청 후 발급되는 일반 인증키(Decoding)
- 배포: `package.json`, `python/pyproject.toml`, `python/src/korea_holidays/__init__.py` 의 버전을 함께 올리고(다르면 테스트 실패), 같은 이름의 태그(예: `v0.3.0`)로 Release 를 발행하면 npm 과 PyPI 에 함께 배포됩니다.

## 운영

- **요청 제한**: IP 당 분당 120회 ([`wrangler.toml`](wrangler.toml) 의 `[[ratelimits]]`)
- **로그·사용량**: Cloudflare 대시보드 → Workers & Pages → `korea-holidays-api` → Observability / Metrics
- **커스텀 도메인**: Cloudflare 에 도메인을 등록한 뒤 `wrangler.toml` 의 `routes` 주석을 풀고 도메인을 넣으면 됩니다.
- **카카오톡 공유**: [카카오 개발자 콘솔](https://developers.kakao.com)에서 앱을 만들고 Web 플랫폼에 사이트 도메인을 등록한 뒤, JavaScript 키를 `wrangler.toml` 의 `[vars] KAKAO_JS_KEY` 에 넣으면 계산기 페이지에 공유 버튼이 나타납니다.

## 데이터 기준

「공휴일에 관한 법률」, 「관공서의 공휴일에 관한 규정」과 정부의 임시공휴일 지정 발표를 기준으로 합니다.
데이터는 [`src/data/holidays.ts`](src/data/holidays.ts) 에 있으며, 오류를 발견하면 이슈나 PR 로 알려주세요.

> 관공서 기준 공휴일입니다. 민간 기업의 휴무 여부는 회사 규정에 따라 다를 수 있습니다.

## License

[MIT](LICENSE)
