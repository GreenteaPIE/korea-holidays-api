# 🇰🇷 Korea Holidays API

대한민국 공휴일·영업일 Open API — 대체공휴일·임시공휴일 지원, API 키 없이 JSON으로 바로 사용

- **API 키 없음** · 회원가입 없이 바로 호출
- **대체공휴일·임시공휴일·선거일 포함** · 2026년부터 공휴일이 된 노동절·제헌절 반영
- **영업일 계산** · "영업일 기준 N일 뒤", "기간 내 영업일 수"
- **CORS 허용** · 브라우저에서 바로 `fetch` 가능
- **OpenAPI 문서** · `/docs` 에서 Swagger UI 로 바로 테스트

## 지원 연도

| 연도 | 상태 |
|---|---|
| 2024 ~ 2026 | 확정 |
| 2027 | 잠정 (임시공휴일 등 공식 발표에 따라 바뀔 수 있음, 응답의 `provisional: true`) |

## 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/years` | 지원 연도 목록 |
| GET | `/holidays?year=2026` | 연도별 공휴일 목록 (`year` 생략 시 올해) |
| GET | `/holidays/check?date=2026-10-09` | 특정 날짜의 공휴일·영업일 여부 |
| GET | `/business-days/add?date=2026-09-23&days=3` | 영업일 기준 N일 뒤(음수면 앞) 날짜 |
| GET | `/business-days/count?from=2026-10-01&to=2026-10-31` | 기간 내 영업일 수 (양 끝 포함) |
| GET | `/docs` | Swagger UI |
| GET | `/openapi.json` | OpenAPI 3.0 스펙 |

### 예시

```bash
curl "https://<배포-주소>/holidays/check?date=2026-07-17"
```

```json
{
  "date": "2026-07-17",
  "weekday": "금",
  "isWeekend": false,
  "isHoliday": true,
  "isBusinessDay": false,
  "holidays": [
    { "date": "2026-07-17", "name": "제헌절", "nameEn": "Constitution Day", "type": "national" }
  ]
}
```

```bash
curl "https://<배포-주소>/business-days/add?date=2026-09-23&days=3"
```

```json
{ "date": "2026-09-23", "days": 3, "result": "2026-09-30", "weekday": "수" }
```

추석 연휴(9/24~26)와 주말(9/27)을 건너뛰고 계산합니다.

### 공휴일 `type`

| 값 | 의미 |
|---|---|
| `national` | 법정 공휴일 |
| `substitute` | 대체공휴일 |
| `temporary` | 임시공휴일 |
| `election` | 선거일 |

### 에러 응답

```json
{ "error": { "code": "OUT_OF_RANGE", "message": "2030년 데이터는 아직 지원하지 않습니다. 지원 연도: 2024, 2025, 2026, 2027" } }
```

| 코드 | HTTP | 의미 |
|---|---|---|
| `INVALID_PARAMETER` | 400 | 파라미터 형식 오류 |
| `OUT_OF_RANGE` | 400 | 지원하지 않는 연도 |
| `NOT_FOUND` | 404 | 없는 경로 |

## 개발

```bash
npm install
npm run dev        # http://localhost:8787
npm test
npm run typecheck
```

## 배포 (Cloudflare Workers)

```bash
npx wrangler login
npm run deploy
```

## 데이터 기준

「공휴일에 관한 법률」, 「관공서의 공휴일에 관한 규정」과 정부의 임시공휴일 지정 발표를 기준으로 합니다.
데이터는 [`src/data/holidays.ts`](src/data/holidays.ts) 에 있으며, 오류를 발견하면 이슈나 PR 로 알려주세요.

> 관공서 기준 공휴일입니다. 민간 기업의 휴무 여부는 회사 규정에 따라 다를 수 있습니다.

## License

[MIT](LICENSE)
