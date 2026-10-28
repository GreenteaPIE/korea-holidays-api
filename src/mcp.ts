/**
 * MCP(Model Context Protocol) 서버. Claude 같은 AI 비서가 공휴일·영업일 계산을 도구로 직접 호출할 수 있게 한다.
 *
 * Streamable HTTP 전송의 상태 없는(stateless) 형태만 구현한다: 클라이언트가 POST 로 JSON-RPC 를 보내면
 * application/json 으로 바로 응답하고, 세션이나 서버 → 클라이언트 SSE 스트림은 쓰지 않는다.
 * https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
 */
import * as lib from './lib/index.ts'

const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']

type JsonSchema = {
  type: 'object'
  properties: Record<string, { type: string; description?: string; enum?: readonly string[]; items?: { type: string } }>
  required?: string[]
}

interface Tool {
  name: string
  title: string
  description: string
  inputSchema: JsonSchema
  run: (args: Record<string, any>) => unknown
}

const dateProp = (description: string) => ({ type: 'string', description: `${description} (YYYY-MM-DD)` })

const optionProps = {
  weekend: {
    type: 'string',
    enum: ['sat-sun', 'sun', 'none'],
    description: '휴무 요일. sat-sun(기본): 토·일, sun: 일요일만(토요일 영업), none: 공휴일만 휴무',
  },
  include: { type: 'array', items: { type: 'string' }, description: '추가로 쉬는 날 목록 (회사 창립기념일 등, YYYY-MM-DD)' },
  exclude: { type: 'array', items: { type: 'string' }, description: '주말·공휴일이어도 일하는 날 목록 (YYYY-MM-DD)' },
}

const options = (args: Record<string, any>): lib.CalendarOptions => ({
  weekend: args.weekend,
  include: args.include,
  exclude: args.exclude,
})

const TOOLS: Tool[] = [
  {
    name: 'get_holidays',
    title: '연도별 공휴일',
    description:
      '대한민국 관공서 공휴일 목록(대체공휴일·임시공휴일·선거일 포함). 2026년부터 노동절(5/1)·제헌절(7/17)도 공휴일이다.',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: '연도' },
        month: { type: 'integer', description: '특정 월만 (1~12)' },
        observances: { type: 'boolean', description: 'true 면 어버이날 같은 기념일(휴일 아님)도 포함' },
      },
      required: ['year'],
    },
    run: (a) => {
      const holidays = lib.getHolidays(a.year, { observances: a.observances })
      const month = a.month ? String(a.month).padStart(2, '0') : null
      return {
        year: a.year,
        provisional: lib.isProvisional(a.year),
        holidays: month ? holidays.filter((h) => h.date.slice(5, 7) === month) : holidays,
      }
    },
  },
  {
    name: 'check_date',
    title: '날짜 확인',
    description: '특정 날짜가 공휴일·주말·영업일인지 확인한다. date 를 빼면 오늘(한국 시간).',
    inputSchema: { type: 'object', properties: { date: dateProp('확인할 날짜'), ...optionProps } },
    run: (a) => lib.getDayInfo(a.date ?? new Date(), options(a)),
  },
  {
    name: 'next_holidays',
    title: '다가오는 공휴일',
    description: '기준일(기본 오늘, 당일 포함)부터 다가오는 공휴일과 남은 일수(D-day).',
    inputSchema: {
      type: 'object',
      properties: { from: dateProp('기준일'), count: { type: 'integer', description: '개수 (기본 3, 최대 20)' } },
    },
    run: (a) => ({ holidays: lib.nextHolidays(a.from ?? new Date(), Math.min(20, Math.max(1, a.count ?? 3))) }),
  },
  {
    name: 'add_business_days',
    title: '영업일 더하기',
    description: '영업일 기준 N일 뒤(음수면 앞)의 날짜. 시작일은 세지 않는다. 배송일·마감일 계산에 쓴다.',
    inputSchema: {
      type: 'object',
      properties: { date: dateProp('시작일'), days: { type: 'integer', description: '더할 영업일 수' }, ...optionProps },
      required: ['date', 'days'],
    },
    run: (a) => {
      const result = lib.addBusinessDays(a.date, a.days, options(a))
      return { date: a.date, days: a.days, result, weekday: lib.getDayInfo(result).weekday }
    },
  },
  {
    name: 'count_business_days',
    title: '영업일 수 세기',
    description: '기간(양 끝 포함) 안의 영업일·주말·공휴일 수.',
    inputSchema: {
      type: 'object',
      properties: { from: dateProp('시작일'), to: dateProp('끝 날짜'), ...optionProps },
      required: ['from', 'to'],
    },
    run: (a) => ({ from: a.from, to: a.to, ...lib.countBusinessDays(a.from, a.to, options(a)) }),
  },
  {
    name: 'adjust_to_business_day',
    title: '휴일이면 영업일로 옮기기',
    description:
      '급여일·결제일이 휴일이면 영업일로 옮긴다. rule: previous(앞 영업일, 기본), next(뒤 영업일), modified-previous/modified-next(달이 바뀌면 반대 방향).',
    inputSchema: {
      type: 'object',
      properties: {
        date: dateProp('원래 날짜'),
        rule: { type: 'string', enum: ['previous', 'next', 'modified-previous', 'modified-next'] },
        ...optionProps,
      },
      required: ['date'],
    },
    run: (a) => {
      const result = lib.adjustToBusinessDay(a.date, a.rule ?? 'previous', options(a))
      return { date: a.date, result, weekday: lib.getDayInfo(result).weekday, adjusted: result !== a.date }
    },
  },
  {
    name: 'nth_business_day',
    title: 'N번째 영업일',
    description: '그 달의 N번째 영업일 (정산일 등). n 이 음수면 뒤에서부터, -1 은 마지막 영업일.',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'integer' },
        month: { type: 'integer', description: '1~12' },
        n: { type: 'integer', description: '1 이상 또는 -1 이하' },
        ...optionProps,
      },
      required: ['year', 'month', 'n'],
    },
    run: (a) => {
      const result = lib.nthBusinessDay(a.year, a.month, a.n, options(a))
      if (!result) throw new RangeError(`${a.year}년 ${a.month}월에는 ${Math.abs(a.n)}번째 영업일이 없습니다`)
      return { year: a.year, month: a.month, n: a.n, result, weekday: lib.getDayInfo(result).weekday }
    },
  },
  {
    name: 'long_weekends',
    title: '연휴 목록',
    description: '주말과 공휴일이 이어져 minDays 일(기본 3) 이상 쉬는 연휴 목록.',
    inputSchema: {
      type: 'object',
      properties: { year: { type: 'integer' }, minDays: { type: 'integer', description: '최소 일수 (기본 3)' }, ...optionProps },
      required: ['year'],
    },
    run: (a) => ({ year: a.year, longWeekends: lib.longWeekends(a.year, options(a), a.minDays ?? 3) }),
  },
  {
    name: 'vacation_tips',
    title: '연차 꿀조합 추천',
    description:
      '연차 leaveDays 일 이하로 만들 수 있는 가장 긴 휴가 조합을 추천한다 (긴 순). leaveDates 가 연차를 써야 하는 날이다.',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'integer' },
        leaveDays: { type: 'integer', description: '쓸 수 있는 연차 일수 (1~10)' },
        limit: { type: 'integer', description: '추천 개수 (기본 5)' },
        ...optionProps,
      },
      required: ['year', 'leaveDays'],
    },
    run: (a) => ({
      year: a.year,
      provisional: lib.isProvisional(a.year),
      tips: lib.vacationTips(a.year, Math.min(10, Math.max(1, a.leaveDays)), options(a), Math.min(20, Math.max(1, a.limit ?? 5))),
    }),
  },
  {
    name: 'annual_leave',
    title: '연차 개수 (입사일 기준)',
    description:
      '근로기준법 제60조 기준 연차 개수: 1년 미만은 매달 1일(최대 11일), 1년 이상 15일, 3년차부터 2년마다 1일 가산(최대 25일). 개근 가정, 5인 미만 사업장 제외.',
    inputSchema: {
      type: 'object',
      properties: { hireDate: dateProp('입사일'), date: dateProp('기준일 (기본 오늘)') },
      required: ['hireDate'],
    },
    run: (a) => lib.annualLeave(a.hireDate, a.date ?? new Date()),
  },
  {
    name: 'shipping_date',
    title: '쇼핑몰 출고 예정일',
    description: '지금 주문하면 언제 출고·도착하는지. 마감 시각(한국 시간) 전이고 영업일이면 오늘부터 처리한다.',
    inputSchema: {
      type: 'object',
      properties: {
        cutoff: { type: 'string', description: '당일 출고 마감 HH:MM (기본 14:00)' },
        processingDays: { type: 'integer', description: '출고까지 영업일 (기본 0)' },
        deliveryDays: { type: 'integer', description: '출고 후 도착까지 영업일' },
        ...optionProps,
      },
    },
    run: (a) =>
      lib.shippingDate({ ...options(a), cutoff: a.cutoff, processingDays: a.processingDays, deliveryDays: a.deliveryDays }),
  },
]

const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]))

const TYPE_CHECKS: Record<string, (v: unknown) => boolean> = {
  string: (v) => typeof v === 'string',
  integer: (v) => Number.isInteger(v),
  boolean: (v) => typeof v === 'boolean',
  array: (v) => Array.isArray(v) && v.every((x) => typeof x === 'string'),
}

function validate(schema: JsonSchema, args: Record<string, unknown>): string | null {
  for (const key of schema.required ?? []) {
    if (args[key] === undefined) return `${key} 가 필요합니다`
  }
  for (const [key, value] of Object.entries(args)) {
    const prop = schema.properties[key]
    if (!prop || value === undefined) continue
    if (!TYPE_CHECKS[prop.type]?.(value)) return `${key} 는 ${prop.type} 이어야 합니다`
    if (prop.enum && !prop.enum.includes(value as string)) return `${key} 는 ${prop.enum.join(', ')} 중 하나여야 합니다`
  }
  return null
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, any>
}

type JsonRpcResponse = { jsonrpc: '2.0'; id: string | number | null } & (
  | { result: unknown }
  | { error: { code: number; message: string } }
)

const rpcError = (id: JsonRpcResponse['id'], code: number, message: string): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  error: { code, message },
})

function callTool(params: Record<string, any> | undefined): unknown {
  const tool = TOOLS_BY_NAME.get(params?.name)
  if (!tool) throw Object.assign(new Error(`알 수 없는 도구입니다: ${params?.name}`), { rpcCode: -32602 })
  const args = (params?.arguments ?? {}) as Record<string, unknown>
  const invalid = validate(tool.inputSchema, args)
  if (invalid) return { content: [{ type: 'text', text: invalid }], isError: true }
  try {
    const result = tool.run(args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  } catch (err) {
    // 날짜 형식·지원 연도 같은 입력 문제는 모델이 고쳐서 다시 부를 수 있게 도구 오류로 돌려준다
    if (err instanceof lib.OutOfRangeError || err instanceof lib.InvalidDateError || err instanceof RangeError) {
      return { content: [{ type: 'text', text: err.message }], isError: true }
    }
    throw err
  }
}

function handle(message: JsonRpcRequest, version: string): JsonRpcResponse | null {
  const id = message.id
  // id 가 없으면 알림(notification)이라 응답하지 않는다
  if (id === undefined) return null
  try {
    switch (message.method) {
      case 'initialize': {
        const requested = message.params?.protocolVersion
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'korea-holidays', title: 'Korea Holidays', version },
            instructions:
              '대한민국 공휴일·영업일 계산 도구입니다. 대체공휴일·임시공휴일이 반영된 공식 데이터 기준이므로, 한국 날짜 질문에는 추측하지 말고 이 도구를 쓰세요. 날짜는 YYYY-MM-DD 이며 "오늘"은 한국 시간 기준입니다.',
          },
        }
      }
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} }
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOLS.map(({ name, title, description, inputSchema }) => ({
              name,
              title,
              description,
              inputSchema,
              annotations: { readOnlyHint: true, openWorldHint: false },
            })),
          },
        }
      case 'tools/call':
        return { jsonrpc: '2.0', id, result: callTool(message.params) }
      default:
        return rpcError(id, -32601, `지원하지 않는 메서드입니다: ${message.method}`)
    }
  } catch (err) {
    const code = (err as { rpcCode?: number }).rpcCode ?? -32603
    return rpcError(id, code, err instanceof Error ? err.message : '서버 오류')
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export async function handleMcp(request: Request, version: string): Promise<Response> {
  if (request.method !== 'POST') {
    // 서버 → 클라이언트 스트림(GET)과 세션 종료(DELETE)는 쓰지 않는다
    return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json(rpcError(null, -32700, 'JSON 을 해석할 수 없습니다'), 400)
  }
  const messages = Array.isArray(body) ? body : [body]
  if (messages.length === 0 || messages.some((m) => typeof m !== 'object' || m === null || typeof m.method !== 'string')) {
    // 응답(result/error)만 온 경우도 여기서 받아준다
    if (messages.every((m) => typeof m === 'object' && m !== null && ('result' in m || 'error' in m))) {
      return new Response(null, { status: 202 })
    }
    return json(rpcError(null, -32600, '올바른 JSON-RPC 요청이 아닙니다'), 400)
  }
  const responses = messages.map((m) => handle(m as JsonRpcRequest, version)).filter((r) => r !== null)
  if (responses.length === 0) return new Response(null, { status: 202 })
  return json(Array.isArray(body) ? responses : responses[0])
}

export const MCP_TOOL_NAMES = TOOLS.map((t) => t.name)
