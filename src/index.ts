import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'
import { PROVISIONAL_YEARS, SUPPORTED_YEARS } from './data/holidays'
import {
  OutOfRangeError,
  addBusinessDays,
  countBusinessDays,
  getHolidays,
  holidaysOn,
  isBusinessDay,
  isProvisional,
} from './lib/calendar'
import { formatDate, isWeekend, parseDate, weekdayKo } from './lib/date'

// ---------- 스키마 ----------

const DateString = z
  .string()
  .refine((v) => parseDate(v) !== null, { message: 'YYYY-MM-DD 형식의 올바른 날짜여야 합니다' })

const HolidaySchema = z
  .object({
    date: z.string().openapi({ example: '2026-10-09' }),
    name: z.string().openapi({ example: '한글날' }),
    nameEn: z.string().openapi({ example: 'Hangeul Day' }),
    type: z.enum(['national', 'substitute', 'temporary', 'election']).openapi({
      description: 'national: 법정 공휴일, substitute: 대체공휴일, temporary: 임시공휴일, election: 선거일',
    }),
  })
  .openapi('Holiday')

const ErrorSchema = z
  .object({
    error: z.object({
      code: z.enum(['INVALID_PARAMETER', 'OUT_OF_RANGE', 'NOT_FOUND', 'INTERNAL_ERROR']),
      message: z.string(),
    }),
  })
  .openapi('Error')

const errorResponse = {
  400: { content: { 'application/json': { schema: ErrorSchema } }, description: '잘못된 요청 또는 지원하지 않는 연도' },
}

// ---------- 라우트 정의 ----------

const yearsRoute = createRoute({
  method: 'get',
  path: '/years',
  tags: ['Holidays'],
  summary: '지원 연도 목록',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            years: z.array(z.number()).openapi({ example: [2024, 2025, 2026, 2027] }),
            provisional: z.array(z.number()).openapi({ example: [2027], description: '공식 발표 전이라 바뀔 수 있는 연도' }),
          }),
        },
      },
      description: '지원 연도',
    },
  },
})

const holidaysRoute = createRoute({
  method: 'get',
  path: '/holidays',
  tags: ['Holidays'],
  summary: '연도별 공휴일 목록',
  request: {
    query: z.object({
      year: z.coerce.number().int().optional().openapi({ example: 2026, description: '생략하면 올해(한국 시간 기준)' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            year: z.number().openapi({ example: 2026 }),
            provisional: z.boolean().openapi({ description: 'true 면 공식 발표 전 데이터' }),
            count: z.number(),
            holidays: z.array(HolidaySchema),
          }),
        },
      },
      description: '공휴일 목록',
    },
    ...errorResponse,
  },
})

const checkRoute = createRoute({
  method: 'get',
  path: '/holidays/check',
  tags: ['Holidays'],
  summary: '특정 날짜의 공휴일·영업일 여부',
  request: {
    query: z.object({ date: DateString.openapi({ example: '2026-10-09' }) }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            date: z.string().openapi({ example: '2026-10-09' }),
            weekday: z.string().openapi({ example: '금' }),
            isWeekend: z.boolean(),
            isHoliday: z.boolean(),
            isBusinessDay: z.boolean(),
            holidays: z.array(HolidaySchema),
          }),
        },
      },
      description: '날짜 정보',
    },
    ...errorResponse,
  },
})

const addRoute = createRoute({
  method: 'get',
  path: '/business-days/add',
  tags: ['Business Days'],
  summary: '영업일 기준 N일 뒤(앞) 날짜',
  description: '주말과 공휴일을 건너뛰고 계산합니다. 시작일은 세지 않으며, days 가 음수면 과거로 계산합니다.',
  request: {
    query: z.object({
      date: DateString.openapi({ example: '2026-09-23' }),
      days: z.coerce.number().int().min(-1000).max(1000).openapi({ example: 3 }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            date: z.string().openapi({ example: '2026-09-23' }),
            days: z.number().openapi({ example: 3 }),
            result: z.string().openapi({ example: '2026-09-30' }),
            weekday: z.string().openapi({ example: '수' }),
          }),
        },
      },
      description: '계산 결과',
    },
    ...errorResponse,
  },
})

const countRoute = createRoute({
  method: 'get',
  path: '/business-days/count',
  tags: ['Business Days'],
  summary: '기간 내 영업일 수',
  description: 'from 과 to 를 모두 포함해서 셉니다.',
  request: {
    query: z.object({
      from: DateString.openapi({ example: '2026-10-01' }),
      to: DateString.openapi({ example: '2026-10-31' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            from: z.string().openapi({ example: '2026-10-01' }),
            to: z.string().openapi({ example: '2026-10-31' }),
            totalDays: z.number().openapi({ example: 31 }),
            businessDays: z.number().openapi({ example: 20 }),
            weekendDays: z.number().openapi({ example: 9 }),
            holidayDays: z.number().openapi({ example: 2, description: '평일에 걸린 공휴일 수' }),
          }),
        },
      },
      description: '영업일 수',
    },
    ...errorResponse,
  },
})

// ---------- 앱 ----------

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join('.') || 'query'}: ${i.message}`).join(', ')
      return c.json({ error: { code: 'INVALID_PARAMETER' as const, message } }, 400)
    }
  },
})

app.use('*', cors())
app.use('*', async (c, next) => {
  await next()
  if (c.res.status === 200 && !c.res.headers.has('Cache-Control')) {
    c.header('Cache-Control', 'public, max-age=3600')
  }
})

app.openapi(yearsRoute, (c) => c.json({ years: [...SUPPORTED_YEARS], provisional: [...PROVISIONAL_YEARS] }, 200))

app.openapi(holidaysRoute, (c) => {
  const year = c.req.valid('query').year ?? currentKstYear()
  const holidays = getHolidays(year)
  return c.json({ year, provisional: isProvisional(year), count: holidays.length, holidays }, 200)
})

app.openapi(checkRoute, (c) => {
  const date = parseDate(c.req.valid('query').date)!
  const holidays = holidaysOn(date)
  return c.json(
    {
      date: formatDate(date),
      weekday: weekdayKo(date),
      isWeekend: isWeekend(date),
      isHoliday: holidays.length > 0,
      isBusinessDay: isBusinessDay(date),
      holidays,
    },
    200,
  )
})

app.openapi(addRoute, (c) => {
  const query = c.req.valid('query')
  const result = addBusinessDays(parseDate(query.date)!, query.days)
  return c.json({ date: query.date, days: query.days, result: formatDate(result), weekday: weekdayKo(result) }, 200)
})

app.openapi(countRoute, (c) => {
  const query = c.req.valid('query')
  const from = parseDate(query.from)!
  const to = parseDate(query.to)!
  if (from > to) {
    return c.json({ error: { code: 'INVALID_PARAMETER' as const, message: 'from 은 to 보다 이후일 수 없습니다' } }, 400)
  }
  return c.json({ from: query.from, to: query.to, ...countBusinessDays(from, to) }, 200)
})

app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Korea Holidays API',
    version: '0.1.0',
    description: '대한민국 공휴일·영업일 Open API — 대체공휴일·임시공휴일 지원, API 키 없이 JSON으로 바로 사용',
  },
})
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

app.get('/', (c) =>
  c.json({
    name: 'Korea Holidays API',
    docs: '/docs',
    openapi: '/openapi.json',
    endpoints: ['/years', '/holidays', '/holidays/check', '/business-days/add', '/business-days/count'],
  }),
)

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: `${c.req.path} 경로가 없습니다. /docs 를 참고하세요` } }, 404))

app.onError((err, c) => {
  if (err instanceof OutOfRangeError) {
    return c.json({ error: { code: 'OUT_OF_RANGE', message: err.message } }, 400)
  }
  console.error(err)
  return c.json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } }, 500)
})

function currentKstYear(): number {
  return new Date(Date.now() + 9 * 3_600_000).getUTCFullYear()
}

export default app
