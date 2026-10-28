# 🇰🇷 Korea Holidays API

대한민국 공휴일·영업일 Open API & 라이브러리 — 대체공휴일·임시공휴일·연차 추천·캘린더 구독까지, API 키 없이 바로 사용

**🔗 API 주소:** https://korea-holidays-api.greenteapie2023.workers.dev  
**📖 문서(Swagger):** https://korea-holidays-api.greenteapie2023.workers.dev/docs  
**📦 npm:** [`korea-holidays`](https://www.npmjs.com/package/korea-holidays)

- **API 키 없음** · 회원가입 없이 바로 호출
- **대체공휴일·임시공휴일·선거일 포함** · 2026년부터 공휴일이 된 노동절·제헌절 반영
- **영업일 계산** · "영업일 기준 N일 뒤", "기간 내 영업일 수", 토요일 영업·회사 휴일 옵션
- **연휴·연차 추천** · "연차 2일로 최장 9일 휴가"
- **캘린더 구독** · 구글·애플 캘린더에 URL 하나로 추가
- **npm 패키지** · 서버 없이 코드에서 바로 계산 (의존성 0개)
- **CORS 허용** · 브라우저에서 바로 `fetch` 가능

## 지원 연도

| 연도 | 상태 |
|---|---|
| 2024 ~ 2026 | 확정 |
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

`/holidays/check`, `/business-days/*`, `/long-weekends`, `/vacation-tips` 에서 함께 쓸 수 있습니다.

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
import { addBusinessDays, isHoliday, nextHolidays, vacationTips } from 'korea-holidays'

isHoliday('2026-07-17') // true (제헌절)
addBusinessDays('2026-09-23', 3) // '2026-09-30'
addBusinessDays('2026-09-23', 3, { weekend: 'sun' }) // 토요일 영업
nextHolidays(new Date(), 3) // 오늘부터 다가오는 공휴일 3개 (daysUntil 포함)
vacationTips(2027, 2)[0] // { start: '2027-09-11', end: '2027-09-19', days: 9, ... }
```

날짜는 `'YYYY-MM-DD'` 문자열 또는 `Date` 를 받으며, `Date` 는 **한국 시간 기준 날짜**로 해석합니다. 지원 연도 밖이면 `OutOfRangeError`, 형식이 틀리면 `InvalidDateError` 를 던집니다.

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

## 개발

```bash
npm install
npm run dev        # http://localhost:8787
npm test
npm run typecheck
npm run build      # npm 패키지 빌드 (dist/)
```

## 자동화 (GitHub Actions)

| 워크플로 | 시점 | 하는 일 | 필요한 Secrets |
|---|---|---|---|
| [Test & Deploy](.github/workflows/deploy.yml) | `main` 푸시, PR | 테스트 후 Cloudflare Workers 배포 (PR 은 테스트만) | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| [Verify Holiday Data](.github/workflows/verify-data.yml) | 매주 월요일 09:17 (KST) | 공공데이터포털 특일정보와 비교해 다르면 이슈 생성 | `DATA_GO_KR_SERVICE_KEY` |
| [Publish to npm](.github/workflows/publish-npm.yml) | GitHub Release 발행 | npm 에 `korea-holidays` 배포 | `NPM_TOKEN` |

- `DATA_GO_KR_SERVICE_KEY`: [공공데이터포털 한국천문연구원 특일 정보](https://www.data.go.kr/data/15012690/openapi.do) 활용신청 후 발급되는 일반 인증키(Decoding)
- npm 배포: `package.json` 의 `version` 을 올리고, 같은 이름의 태그(예: `v0.2.0`)로 Release 를 발행합니다.

## 운영

- **요청 제한**: IP 당 분당 120회 ([`wrangler.toml`](wrangler.toml) 의 `[[ratelimits]]`)
- **로그·사용량**: Cloudflare 대시보드 → Workers & Pages → `korea-holidays-api` → Observability / Metrics
- **커스텀 도메인**: Cloudflare 에 도메인을 등록한 뒤 `wrangler.toml` 의 `routes` 주석을 풀고 도메인을 넣으면 됩니다.

## 데이터 기준

「공휴일에 관한 법률」, 「관공서의 공휴일에 관한 규정」과 정부의 임시공휴일 지정 발표를 기준으로 합니다.
데이터는 [`src/data/holidays.ts`](src/data/holidays.ts) 에 있으며, 오류를 발견하면 이슈나 PR 로 알려주세요.

> 관공서 기준 공휴일입니다. 민간 기업의 휴무 여부는 회사 규정에 따라 다를 수 있습니다.

## License

[MIT](LICENSE)
