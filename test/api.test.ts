import { describe, expect, it } from 'vitest'
import app from '../src/index'

const get = async (path: string) => {
  const res = await app.request(path)
  return { status: res.status, headers: res.headers, body: (await res.json()) as any }
}

describe('GET /years', () => {
  it('지원 연도와 잠정 연도를 돌려준다', async () => {
    const { status, body } = await get('/years')
    expect(status).toBe(200)
    expect(body.years).toEqual([2024, 2025, 2026, 2027])
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

  it('date 가 없으면 400', async () => {
    expect((await get('/holidays/check')).status).toBe(400)
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
    expect(body).toEqual({ from: '2026-10-01', to: '2026-10-31', totalDays: 31, businessDays: 20, weekendDays: 9, holidayDays: 2 })
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
      expect.arrayContaining(['/years', '/holidays', '/holidays/check', '/business-days/add', '/business-days/count']),
    )
  })

  it('Swagger UI', async () => {
    const res = await app.request('/docs')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('swagger')
  })

  it('없는 경로는 404 JSON', async () => {
    const { status, body } = await get('/nope')
    expect(status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
