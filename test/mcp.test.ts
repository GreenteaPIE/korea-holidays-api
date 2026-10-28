import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../src/index.ts'
import { MCP_TOOL_NAMES } from '../src/mcp.ts'

// 공식 MCP SDK 클라이언트로 붙어서 실제 클라이언트와 호환되는지 확인한다
const client = new Client({ name: 'test', version: '1.0.0' })
const transport = new StreamableHTTPClientTransport(new URL('http://localhost/mcp'), {
  fetch: async (url, init) => app.request(url.toString(), init as RequestInit),
})

beforeAll(async () => {
  await client.connect(transport)
})
afterAll(async () => {
  await client.close()
})

const call = async (name: string, args: Record<string, unknown>) => client.callTool({ name, arguments: args })

describe('MCP (공식 SDK 클라이언트)', () => {
  it('서버 정보와 도구 목록', async () => {
    expect(client.getServerVersion()).toMatchObject({ name: 'korea-holidays' })
    expect(client.getInstructions()).toContain('공휴일')
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name)).toEqual(MCP_TOOL_NAMES)
    expect(tools.every((t) => t.annotations?.readOnlyHint)).toBe(true)
  })

  it('연차 꿀조합', async () => {
    const result = await call('vacation_tips', { year: 2027, leaveDays: 2, limit: 1 })
    expect(result.isError).toBeFalsy()
    expect((result.structuredContent as any).tips[0]).toMatchObject({ start: '2027-09-11', end: '2027-09-19', days: 9 })
    expect((result.content as any)[0].type).toBe('text')
  })

  it('영업일·급여일·연차·날짜 확인', async () => {
    expect(((await call('add_business_days', { date: '2026-09-23', days: 3 })).structuredContent as any).result).toBe('2026-09-30')
    expect(((await call('adjust_to_business_day', { date: '2026-10-25' })).structuredContent as any).result).toBe('2026-10-23')
    expect(((await call('nth_business_day', { year: 2026, month: 12, n: -1 })).structuredContent as any).result).toBe('2026-12-31')
    expect(((await call('annual_leave', { hireDate: '2024-03-02', date: '2026-10-28' })).structuredContent as any).current.days).toBe(15)
    expect(((await call('check_date', { date: '2026-07-17' })).structuredContent as any).holidays[0].name).toBe('제헌절')
    const month = (await call('get_holidays', { year: 2026, month: 10 })).structuredContent as any
    expect(month.holidays.map((h: any) => h.date)).toEqual(['2026-10-03', '2026-10-05', '2026-10-09'])
  })

  it('잘못된 입력은 도구 오류(isError)로 돌려준다', async () => {
    const missing = await call('add_business_days', { date: '2026-09-23' })
    expect(missing.isError).toBe(true)
    expect((missing.content as any)[0].text).toContain('days')
    expect((await call('check_date', { date: '2026-02-30' })).isError).toBe(true)
    expect((await call('get_holidays', { year: 2031 })).isError).toBe(true)
    expect((await call('add_business_days', { date: '2026-09-23', days: 'three' })).isError).toBe(true)
    expect((await call('nth_business_day', { year: 2026, month: 10, n: 30 })).isError).toBe(true)
  })

  it('없는 도구는 프로토콜 오류', async () => {
    await expect(call('nope', {})).rejects.toThrow()
  })
})

describe('MCP HTTP 세부 동작', () => {
  const post = (body: unknown) =>
    app.request('/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  it('GET 은 405', async () => {
    const res = await app.request('/mcp')
    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('POST')
  })

  it('알림만 오면 202, 잘못된 JSON 은 400', async () => {
    expect((await post({ jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202)
    const bad = await app.request('/mcp', { method: 'POST', body: '{' })
    expect(bad.status).toBe(400)
    expect(((await bad.json()) as any).error.code).toBe(-32700)
  })

  it('모르는 프로토콜 버전이면 최신 버전으로, 배치 요청도 처리', async () => {
    const init = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } })
    expect(((await init.json()) as any).result.protocolVersion).toBe('2025-11-25')
    const batch = await post([
      { jsonrpc: '2.0', id: 1, method: 'ping' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'unknown/method' },
    ])
    const body = (await batch.json()) as any[]
    expect(body).toHaveLength(2)
    expect(body[1].error.code).toBe(-32601)
  })
})
