import { describe, expect, it } from 'vitest'
import app from '../src/index.ts'

const get = async (path: string) => {
  const res = await app.request(path)
  return { status: res.status, headers: res.headers, body: (await res.json()) as any }
}

describe('GET /years', () => {
  it('지원 연도와 잠정 연도를 돌려준다', async () => {
    const { status, body } = await get('/years')
    expect(status).toBe(200)
    expect(body.years).toEqual([2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027])
    expect(body.provisional).toEqual([2027])
  })
})

describe('GET /holidays', () => {
  it('연도별 목록', async () => {
    const { status, body, headers } = await get('/holidays?year=2026')
    expect(status).toBe(200)
    expect(body).toMatchObject({ year: 2026, provisional: false, count: body.holidays.length })
    expect(body.holidays[0]).toEqual({ date: '2026-01-01', name: '신정', nameEn: "New Year's Day", type: 'national' })
    expect(headers.get('Cache-Control')).toBe('public, max-age=3600')
    expect(headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('잠정 연도 표시', async () => {
    expect((await get('/holidays?year=2027')).body.provisional).toBe(true)
  })

  it('지원하지 않는 연도는 400 OUT_OF_RANGE', async () => {
    const { status, body } = await get('/holidays?year=2030')
    expect(status).toBe(400)
    expect(body.error.code).toBe('OUT_OF_RANGE')
  })

  it('숫자가 아닌 연도는 400 INVALID_PARAMETER', async () => {
    const { status, body } = await get('/holidays?year=abc')
    expect(status).toBe(400)
    expect(body.error.code).toBe('INVALID_PARAMETER')
  })
})

describe('GET /holidays 필터', () => {
  it('month, type', async () => {
    const { body } = await get('/holidays?year=2026&month=10')
    expect(body.holidays.map((h: any) => h.date)).toEqual(['2026-10-03', '2026-10-05', '2026-10-09'])
    const subs = (await get('/holidays?year=2026&type=substitute')).body.holidays
    expect(subs.map((h: any) => h.date)).toEqual(['2026-03-02', '2026-05-25', '2026-08-17', '2026-10-05'])
  })

  it('observances, type=observance', async () => {
    expect((await get('/holidays?year=2026&month=5&observances=true')).body.holidays.map((h: any) => h.name)).toEqual([
      '노동절',
      '어린이날',
      '어버이날',
      '스승의 날',
      '부처님오신날',
      '대체공휴일(부처님오신날)',
    ])
    const obs = (await get('/holidays?year=2026&type=observance')).body.holidays
    expect(obs.every((h: any) => h.type === 'observance')).toBe(true)
    expect(obs.length).toBeGreaterThan(0)
  })

  it('month 범위 오류', async () => {
    expect((await get('/holidays?year=2026&month=13')).status).toBe(400)
  })
})

describe('GET /holidays/next', () => {
  it('D-day', async () => {
    const { status, body } = await get('/holidays/next?date=2026-10-28&count=2')
    expect(status).toBe(200)
    expect(body.from).toBe('2026-10-28')
    expect(body.holidays.map((h: any) => [h.name, h.daysUntil])).toEqual([
      ['기독탄신일', 58],
      ['신정', 65],
    ])
  })
})

describe('GET /long-weekends, /vacation-tips', () => {
  it('연휴 목록', async () => {
    const { status, body } = await get('/long-weekends?year=2026&minDays=4')
    expect(status).toBe(200)
    expect(body).toMatchObject({ year: 2026, provisional: false, count: 2 })
    expect(body.longWeekends.map((l: any) => l.start)).toEqual(['2026-02-14', '2026-09-24'])
  })

  it('연차 추천', async () => {
    const { status, body } = await get('/vacation-tips?year=2027&leaveDays=2&limit=1')
    expect(status).toBe(200)
    expect(body).toMatchObject({ year: 2027, provisional: true, leaveDays: 2 })
    expect(body.tips[0]).toMatchObject({ start: '2027-09-11', end: '2027-09-19', days: 9 })
  })

  it('leaveDays 범위 오류', async () => {
    expect((await get('/vacation-tips?year=2026&leaveDays=0')).status).toBe(400)
  })
})

describe('GET /calendar.ics', () => {
  it('iCalendar 를 돌려준다', async () => {
    const res = await app.request('/calendar.ics?include=2026-03-15&includeName=창립기념일')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
    const text = await res.text()
    expect(text).toContain('BEGIN:VCALENDAR')
    expect(text).toContain('SUMMARY:창립기념일')
  })
})

describe('GET /holidays/check', () => {
  it('공휴일', async () => {
    const { status, body } = await get('/holidays/check?date=2026-10-09')
    expect(status).toBe(200)
    expect(body).toMatchObject({ date: '2026-10-09', weekday: '금', isWeekend: false, isHoliday: true, isBusinessDay: false })
    expect(body.holidays[0].name).toBe('한글날')
  })

  it('잘못된 날짜는 400', async () => {
    const { status, body } = await get('/holidays/check?date=2026-13-01')
    expect(status).toBe(400)
    expect(body.error.code).toBe('INVALID_PARAMETER')
  })

  it('date 가 없으면 오늘, 짧게 캐시', async () => {
    const { status, body, headers } = await get('/holidays/check')
    expect(status).toBe(200)
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(headers.get('Cache-Control')).toBe('public, max-age=300')
  })

  it('옵션 반영: 토요일 영업, 회사 휴일', async () => {
    expect((await get('/holidays/check?date=2026-10-10&weekend=sun')).body).toMatchObject({ kind: 'business', isBusinessDay: true })
    expect((await get('/holidays/check?date=2026-10-08&include=2026-10-08')).body).toMatchObject({
      kind: 'holiday',
      isHoliday: false,
      isBusinessDay: false,
    })
  })

  it('include 형식이 틀리면 400', async () => {
    expect((await get('/holidays/check?date=2026-10-08&include=2026-10-08,nope')).status).toBe(400)
  })
})

describe('GET /business-days/add', () => {
  it('영업일 계산', async () => {
    const { status, body } = await get('/business-days/add?date=2026-09-23&days=3')
    expect(status).toBe(200)
    expect(body).toEqual({ date: '2026-09-23', days: 3, result: '2026-09-30', weekday: '수' })
  })

  it('days 범위를 넘으면 400', async () => {
    expect((await get('/business-days/add?date=2026-09-23&days=5000')).status).toBe(400)
  })
})

describe('GET /business-days/count', () => {
  it('기간 영업일 수', async () => {
    const { status, body } = await get('/business-days/count?from=2026-10-01&to=2026-10-31')
    expect(status).toBe(200)
    expect(body).toEqual({ from: '2026-10-01', to: '2026-10-31', totalDays: 31, businessDays: 20, weekendDays: 8, holidayDays: 3 })
  })

  it('from 이 to 보다 늦으면 400', async () => {
    const { status, body } = await get('/business-days/count?from=2026-10-31&to=2026-10-01')
    expect(status).toBe(400)
    expect(body.error.code).toBe('INVALID_PARAMETER')
  })
})

describe('문서와 기타', () => {
  it('OpenAPI 문서를 제공한다', async () => {
    const { status, body } = await get('/openapi.json')
    expect(status).toBe(200)
    expect(Object.keys(body.paths)).toEqual(
      expect.arrayContaining([
        '/years',
        '/holidays',
        '/holidays/check',
        '/holidays/next',
        '/business-days/add',
        '/business-days/count',
        '/long-weekends',
        '/vacation-tips',
        '/calendar.ics',
      ]),
    )
  })

  it('Swagger UI', async () => {
    const res = await app.request('/docs')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('swagger')
  })

  it('/ 는 브라우저면 소개 페이지, 아니면 JSON', async () => {
    const html = await app.request('/', { headers: { Accept: 'text/html,application/xhtml+xml' } })
    expect(html.headers.get('Content-Type')).toContain('text/html')
    expect(await html.text()).toContain('Korea Holidays API')
    const { body } = await get('/')
    expect(body.endpoints).toContain('/vacation-tips')
  })

  it('/vacation 연차 계산기 페이지', async () => {
    const res = await app.request('/vacation')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('연차 꿀조합 계산기')
    expect(html).toContain('og:image')
    expect(html).toContain('/og-vacation.png')
  })

  it('소개 페이지에 SEO 태그가 있다', async () => {
    const html = await (await app.request('/', { headers: { Accept: 'text/html' } })).text()
    expect(html).toContain('<link rel="canonical" href="https://korea-holidays-api.greenteapie2023.workers.dev/">')
    expect(html).toContain('application/ld+json')
    expect(html).toContain('href="/vacation"')
  })

  it('rate limit 을 넘으면 429', async () => {
    const env = { RATE_LIMITER: { limit: async () => ({ success: false }) } }
    const res = await app.request('/years', {}, env)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
    expect(((await res.json()) as any).error.code).toBe('RATE_LIMITED')
    const ok = await app.request('/years', {}, { RATE_LIMITER: { limit: async () => ({ success: true }) } })
    expect(ok.status).toBe(200)
  })

  it('없는 경로는 404 JSON', async () => {
    const { status, body } = await get('/nope')
    expect(status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
