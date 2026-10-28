import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'
import { parseDate } from './lib/date.ts'
import {
  InvalidDateError,
  OutOfRangeError,
  PROVISIONAL_YEARS,
  SUPPORTED_YEARS,
  addBusinessDays,
  countBusinessDays,
  getDayInfo,
  getHolidays,
  isProvisional,
  longWeekends,
  nextHolidays,
  toIcs,
  vacationTips,
  type CalendarOptions,
} from './lib/index.ts'
import { LANDING_HTML } from './pages/landing.ts'
import { vacationHtml } from './pages/vacation.ts'

type Bindings = {
  /** wrangler.toml 의 [[ratelimits]]. 로컬 테스트에서는 없다. */
  RATE_LIMITER?: RateLimit
}

const VERSION = '0.2.0'

// ---------- 스키마 ----------

const DateString = z
  .string()
  .refine((v) => parseDate(v) !== null, { message: 'YYYY-MM-DD 형식의 올바른 날짜여야 합니다' })

const DateList = z
  .string()
  .refine((v) => v.split(',').every((s) => parseDate(s.trim()) !== null), {
    message: '쉼표로 구분한 YYYY-MM-DD 날짜 목록이어야 합니다',
  })

const BoolString = z.enum(['true', 'false'])

const HolidayTypeEnum = z.enum(['national', 'substitute', 'temporary', 'election', 'observance'])

const HolidaySchema = z
  .object({
    date: z.string().openapi({ example: '2026-10-09' }),
    name: z.string().openapi({ example: '한글날' }),
    nameEn: z.string().openapi({ example: 'Hangeul Day' }),
    type: HolidayTypeEnum.openapi({
      description:
        'national: 법정 공휴일, substitute: 대체공휴일, temporary: 임시공휴일, election: 선거일, observance: 기념일(휴일 아님)',
    }),
  })
  .openapi('Holiday')

const ErrorSchema = z
  .object({
    error: z.object({
      code: z.enum(['INVALID_PARAMETER', 'OUT_OF_RANGE', 'NOT_FOUND', 'RATE_LIMITED', 'INTERNAL_ERROR']),
      message: z.string(),
    }),
  })
  .openapi('Error')

const errorResponse = {
  400: { content: { 'application/json': { schema: ErrorSchema } }, description: '잘못된 요청 또는 지원하지 않는 연도' },
}

/** 영업일 계산에 공통으로 쓰는 옵션 */
const optionsQuery = {
  weekend: z.enum(['sat-sun', 'sun', 'none']).optional().openapi({
    description: '휴무 요일. sat-sun(기본): 토·일, sun: 일요일만(토요일 영업), none: 주말 구분 없음',
  }),
  include: DateList.optional().openapi({
    example: '2026-03-15',
    description: '추가로 쉬는 날 (회사 창립기념일 등), 쉼표로 구분',
  }),
  exclude: DateList.optional().openapi({
    example: '2026-05-01',
    description: '주말·공휴일이어도 일하는 날 (노동절 출근 등), 쉼표로 구분',
  }),
}

const splitDates = (value?: string) => (value ? value.split(',').map((s) => s.trim()) : undefined)

function toOptions(query: { weekend?: CalendarOptions['weekend']; include?: string; exclude?: string }): CalendarOptions {
  return { weekend: query.weekend, include: splitDates(query.include), exclude: splitDates(query.exclude) }
}

const json = <T extends z.ZodType>(schema: T, description: string) => ({
  content: { 'application/json': { schema } },
  description,
})

const YearQuery = z.coerce.number().int().optional().openapi({ example: 2026, description: '생략하면 올해(한국 시간 기준)' })

// ---------- 라우트 정의 ----------

const yearsRoute = createRoute({
  method: 'get',
  path: '/years',
  tags: ['Holidays'],
  summary: '지원 연도 목록',
  responses: {
    200: json(
      z.object({
        years: z.array(z.number()).openapi({ example: [2024, 2025, 2026, 2027] }),
        provisional: z.array(z.number()).openapi({ example: [2027], description: '공식 발표 전이라 바뀔 수 있는 연도' }),
      }),
      '지원 연도',
    ),
  },
})

const holidaysRoute = createRoute({
  method: 'get',
  path: '/holidays',
  tags: ['Holidays'],
  summary: '연도별 공휴일 목록',
  request: {
    query: z.object({
      year: YearQuery,
      month: z.coerce.number().int().min(1).max(12).optional().openapi({ example: 10, description: '특정 월만' }),
      type: HolidayTypeEnum.optional().openapi({ description: '특정 유형만 (예: substitute)' }),
      observances: BoolString.optional().openapi({ description: 'true 면 어버이날·스승의 날 같은 기념일(휴일 아님)도 포함' }),
    }),
  },
  responses: {
    200: json(
      z.object({
        year: z.number().openapi({ example: 2026 }),
        provisional: z.boolean().openapi({ description: 'true 면 공식 발표 전 데이터' }),
        count: z.number(),
        holidays: z.array(HolidaySchema),
      }),
      '공휴일 목록',
    ),
    ...errorResponse,
  },
})

const checkRoute = createRoute({
  method: 'get',
  path: '/holidays/check',
  tags: ['Holidays'],
  summary: '특정 날짜의 공휴일·영업일 여부',
  request: {
    query: z.object({
      date: DateString.optional().openapi({ example: '2026-10-09', description: '생략하면 오늘(한국 시간 기준)' }),
      ...optionsQuery,
    }),
  },
  responses: {
    200: json(
      z.object({
        date: z.string().openapi({ example: '2026-10-09' }),
        weekday: z.string().openapi({ example: '금' }),
        kind: z.enum(['business', 'weekend', 'holiday']).openapi({ description: '옵션을 반영한 날짜 구분' }),
        isWeekend: z.boolean(),
        isHoliday: z.boolean().openapi({ description: '법정 공휴일 여부 (include 옵션과 무관)' }),
        isBusinessDay: z.boolean(),
        holidays: z.array(HolidaySchema),
      }),
      '날짜 정보',
    ),
    ...errorResponse,
  },
})

const nextRoute = createRoute({
  method: 'get',
  path: '/holidays/next',
  tags: ['Holidays'],
  summary: '다가오는 공휴일 (D-day)',
  request: {
    query: z.object({
      date: DateString.optional().openapi({ example: '2026-10-28', description: '기준일 (생략하면 오늘). 기준일 당일도 포함' }),
      count: z.coerce.number().int().min(1).max(20).optional().openapi({ example: 3, description: '개수 (기본 1, 최대 20)' }),
    }),
  },
  responses: {
    200: json(
      z.object({
        from: z.string().openapi({ example: '2026-10-28' }),
        holidays: z.array(
          HolidaySchema.extend({ daysUntil: z.number().openapi({ example: 58, description: '기준일로부터 남은 일수 (D-day)' }) }),
        ),
      }),
      '다가오는 공휴일',
    ),
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
      ...optionsQuery,
    }),
  },
  responses: {
    200: json(
      z.object({
        date: z.string().openapi({ example: '2026-09-23' }),
        days: z.number().openapi({ example: 3 }),
        result: z.string().openapi({ example: '2026-09-30' }),
        weekday: z.string().openapi({ example: '수' }),
      }),
      '계산 결과',
    ),
    ...errorResponse,
  },
})

const countRoute = createRoute({
  method: 'get',
  path: '/business-days/count',
  tags: ['Business Days'],
  summary: '기간 내 영업일 수',
  description: 'from 과 to 를 모두 포함해서 셉니다. 주말과 겹친 공휴일은 holidayDays 로 셉니다.',
  request: {
    query: z.object({
      from: DateString.openapi({ example: '2026-10-01' }),
      to: DateString.openapi({ example: '2026-10-31' }),
      ...optionsQuery,
    }),
  },
  responses: {
    200: json(
      z.object({
        from: z.string().openapi({ example: '2026-10-01' }),
        to: z.string().openapi({ example: '2026-10-31' }),
        totalDays: z.number().openapi({ example: 31 }),
        businessDays: z.number().openapi({ example: 20 }),
        weekendDays: z.number().openapi({ example: 8 }),
        holidayDays: z.number().openapi({ example: 3 }),
      }),
      '영업일 수',
    ),
    ...errorResponse,
  },
})

const LongWeekendSchema = z
  .object({
    start: z.string().openapi({ example: '2026-09-24' }),
    end: z.string().openapi({ example: '2026-09-27' }),
    days: z.number().openapi({ example: 4 }),
    holidays: z.array(z.string()).openapi({ example: ['추석 전날', '추석', '추석 다음날'] }),
  })
  .openapi('LongWeekend')

const longWeekendsRoute = createRoute({
  method: 'get',
  path: '/long-weekends',
  tags: ['Vacation'],
  summary: '연휴 목록',
  description: '주말과 공휴일이 이어져 minDays 일 이상 쉬는 기간입니다. 해당 연도에 시작하는 연휴만 돌려줍니다.',
  request: {
    query: z.object({
      year: YearQuery,
      minDays: z.coerce.number().int().min(2).max(10).optional().openapi({ example: 3, description: '최소 연휴 일수 (기본 3)' }),
      ...optionsQuery,
    }),
  },
  responses: {
    200: json(
      z.object({ year: z.number(), provisional: z.boolean(), count: z.number(), longWeekends: z.array(LongWeekendSchema) }),
      '연휴 목록',
    ),
    ...errorResponse,
  },
})

const vacationTipsRoute = createRoute({
  method: 'get',
  path: '/vacation-tips',
  tags: ['Vacation'],
  summary: '연차 추천 (최장 휴가 조합)',
  description: '연차 leaveDays 일 이하로 만들 수 있는 가장 긴 휴가를 추천합니다. 긴 순서, 같으면 연차를 덜 쓰는 순서입니다.',
  request: {
    query: z.object({
      year: YearQuery,
      leaveDays: z.coerce.number().int().min(1).max(10).optional().openapi({ example: 2, description: '쓸 수 있는 연차 일수 (기본 2)' }),
      limit: z.coerce.number().int().min(1).max(20).optional().openapi({ example: 5, description: '추천 개수 (기본 5)' }),
      ...optionsQuery,
    }),
  },
  responses: {
    200: json(
      z.object({
        year: z.number(),
        provisional: z.boolean(),
        leaveDays: z.number(),
        tips: z.array(
          LongWeekendSchema.extend({
            leaveDates: z.array(z.string()).openapi({ example: ['2027-09-13', '2027-09-17'] }),
            efficiency: z.number().openapi({ example: 4.5, description: '연차 하루당 쉬는 날 수' }),
          }),
        ),
      }),
      '연차 추천',
    ),
    ...errorResponse,
  },
})

const icsRoute = createRoute({
  method: 'get',
  path: '/calendar.ics',
  tags: ['Calendar'],
  summary: '캘린더 구독 (iCalendar)',
  description:
    '구글 캘린더·애플 캘린더에 URL 로 구독할 수 있는 .ics 파일입니다. 지원하는 모든 연도의 공휴일이 들어 있고, 하루에 한 번 갱신됩니다.',
  request: {
    query: z.object({
      lang: z.enum(['ko', 'en']).optional().openapi({ description: '일정 이름 언어 (기본 ko)' }),
      observances: BoolString.optional().openapi({ description: 'true 면 기념일(휴일 아님)도 포함' }),
      include: DateList.optional().openapi({ example: '2026-03-15', description: '추가할 휴일 (회사 휴일 등), 쉼표로 구분' }),
      includeName: z.string().max(50).optional().openapi({ example: '창립기념일', description: 'include 로 추가한 날의 일정 이름' }),
      exclude: DateList.optional().openapi({ example: '2026-05-01', description: '목록에서 뺄 날짜, 쉼표로 구분' }),
    }),
  },
  responses: {
    200: { content: { 'text/calendar': { schema: z.string() } }, description: 'iCalendar 파일' },
    ...errorResponse,
  },
})

// ---------- 앱 ----------

const app = new OpenAPIHono<{ Bindings: Bindings }>({
  defaultHook: (result, c) => {
    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join('.') || 'query'}: ${i.message}`).join(', ')
      return c.json({ error: { code: 'INVALID_PARAMETER' as const, message } }, 400)
    }
  },
})

app.use('*', cors())

app.use('*', async (c, next) => {
  const limiter = c.env?.RATE_LIMITER
  if (limiter) {
    const key = c.req.header('cf-connecting-ip') ?? 'unknown'
    const { success } = await limiter.limit({ key })
    if (!success) {
      c.header('Retry-After', '60')
      return c.json({ error: { code: 'RATE_LIMITED', message: '요청이 너무 많습니다. 1분 뒤에 다시 시도해 주세요' } }, 429)
    }
  }
  await next()
})

app.use('*', async (c, next) => {
  await next()
  if (c.res.status === 200 && !c.res.headers.has('Cache-Control')) {
    c.header('Cache-Control', 'public, max-age=3600')
  }
})

const todayKst = () => getDayInfo(new Date()).date
const currentKstYear = () => Number(todayKst().slice(0, 4))

app.openapi(yearsRoute, (c) => c.json({ years: [...SUPPORTED_YEARS], provisional: [...PROVISIONAL_YEARS] }, 200))

app.openapi(holidaysRoute, (c) => {
  const query = c.req.valid('query')
  const year = query.year ?? currentKstYear()
  const month = query.month?.toString().padStart(2, '0')
  const holidays = getHolidays(year, { observances: query.observances === 'true' || query.type === 'observance' }).filter(
    (h) => (!month || h.date.slice(5, 7) === month) && (!query.type || h.type === query.type),
  )
  return c.json({ year, provisional: isProvisional(year), count: holidays.length, holidays }, 200)
})

app.openapi(checkRoute, (c) => {
  const query = c.req.valid('query')
  // 오늘 날짜 응답은 자정이 지나면 바뀌므로 오래 캐시하지 않는다
  if (!query.date) c.header('Cache-Control', 'public, max-age=300')
  return c.json(getDayInfo(query.date ?? new Date(), toOptions(query)), 200)
})

app.openapi(nextRoute, (c) => {
  const query = c.req.valid('query')
  const from = query.date ?? todayKst()
  if (!query.date) c.header('Cache-Control', 'public, max-age=300')
  return c.json({ from, holidays: nextHolidays(from, query.count ?? 1) }, 200)
})

app.openapi(addRoute, (c) => {
  const query = c.req.valid('query')
  const result = addBusinessDays(query.date, query.days, toOptions(query))
  return c.json({ date: query.date, days: query.days, result, weekday: getDayInfo(result).weekday }, 200)
})

app.openapi(countRoute, (c) => {
  const query = c.req.valid('query')
  if (query.from > query.to) {
    return c.json({ error: { code: 'INVALID_PARAMETER' as const, message: 'from 은 to 보다 이후일 수 없습니다' } }, 400)
  }
  return c.json({ from: query.from, to: query.to, ...countBusinessDays(query.from, query.to, toOptions(query)) }, 200)
})

app.openapi(longWeekendsRoute, (c) => {
  const query = c.req.valid('query')
  const year = query.year ?? currentKstYear()
  const list = longWeekends(year, toOptions(query), query.minDays ?? 3)
  return c.json({ year, provisional: isProvisional(year), count: list.length, longWeekends: list }, 200)
})

app.openapi(vacationTipsRoute, (c) => {
  const query = c.req.valid('query')
  const year = query.year ?? currentKstYear()
  const leaveDays = query.leaveDays ?? 2
  const tips = vacationTips(year, leaveDays, toOptions(query), query.limit ?? 5)
  return c.json({ year, provisional: isProvisional(year), leaveDays, tips }, 200)
})

app.openapi(icsRoute, (c) => {
  const query = c.req.valid('query')
  const body = toIcs({
    lang: query.lang,
    observances: query.observances === 'true',
    include: splitDates(query.include),
    includeName: query.includeName,
    exclude: splitDates(query.exclude),
  })
  return c.body(body, 200, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'inline; filename="korea-holidays.ics"',
  })
})

app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Korea Holidays API',
    version: VERSION,
    description: '대한민국 공휴일·영업일 Open API — 대체공휴일·임시공휴일 지원, API 키 없이 JSON으로 바로 사용',
  },
})
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

app.get('/vacation', (c) => {
  const today = todayKst()
  const thisYear = Number(today.slice(0, 4))
  const years = SUPPORTED_YEARS.filter((y) => y >= thisYear)
  // 10월부터는 다음 해 연차 계획을 세우는 시기라 다음 해를 먼저 보여준다
  const preferred = Number(today.slice(5, 7)) >= 10 ? thisYear + 1 : thisYear
  const defaultYear = years.includes(preferred) ? preferred : (years[0] ?? SUPPORTED_YEARS.at(-1)!)
  c.header('Cache-Control', 'public, max-age=3600')
  return c.html(
    vacationHtml({ years: years.length ? years : [defaultYear], defaultYear, provisional: [...PROVISIONAL_YEARS] }),
  )
})

app.get('/', (c) => {
  if (c.req.header('Accept')?.includes('text/html')) return c.html(LANDING_HTML)
  return c.json({
    name: 'Korea Holidays API',
    version: VERSION,
    docs: '/docs',
    openapi: '/openapi.json',
    endpoints: [
      '/years',
      '/holidays',
      '/holidays/check',
      '/holidays/next',
      '/business-days/add',
      '/business-days/count',
      '/long-weekends',
      '/vacation-tips',
      '/calendar.ics',
    ],
  })
})

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: `${c.req.path} 경로가 없습니다. /docs 를 참고하세요` } }, 404))

app.onError((err, c) => {
  if (err instanceof OutOfRangeError) {
    return c.json({ error: { code: 'OUT_OF_RANGE', message: err.message } }, 400)
  }
  if (err instanceof InvalidDateError) {
    return c.json({ error: { code: 'INVALID_PARAMETER', message: err.message } }, 400)
  }
  console.error(err)
  return c.json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } }, 500)
})

export default app
