import { beforeAll, describe, expect, it } from 'vitest'
import { DISCORD_COMMANDS, verifyDiscordRequest } from '../src/discord.ts'
import app from '../src/index.ts'

// 디스코드 대신 테스트용 키로 서명해서 보낸다
let publicKeyHex = ''
let privateKey: CryptoKey

beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair
  privateKey = pair.privateKey
  const raw = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer)
  publicKeyHex = [...raw].map((b) => b.toString(16).padStart(2, '0')).join('')
})

async function send(body: unknown, { tamper = false } = {}) {
  const text = JSON.stringify(body)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const sig = new Uint8Array(await crypto.subtle.sign('Ed25519', privateKey, new TextEncoder().encode(timestamp + text)))
  const signature = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('')
  return app.request(
    '/discord/interactions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Signature-Ed25519': signature, 'X-Signature-Timestamp': timestamp },
      body: tamper ? text.replace('}', ',"x":1}') : text,
    },
    { DISCORD_PUBLIC_KEY: publicKeyHex, RATE_LIMITER: { limit: async () => ({ success: false }) } },
  )
}

const command = (name: string, options: Record<string, string | number> = {}) => ({
  type: 2,
  data: { name, options: Object.entries(options).map(([n, value]) => ({ name: n, value })) },
})

describe('디스코드 봇', () => {
  it('서명이 맞으면 PING 에 PONG (IP 제한에 걸리지 않음)', async () => {
    const res = await send({ type: 1 })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ type: 1 })
  })

  it('서명이 틀리면 401, 키가 없으면 503', async () => {
    expect((await send({ type: 1 }, { tamper: true })).status).toBe(401)
    expect((await app.request('/discord/interactions', { method: 'POST', body: '{}' })).status).toBe(503)
    expect(await verifyDiscordRequest('zz', 'zz', '1', '{}')).toBe(false)
  })

  it('/공휴일', async () => {
    const body = (await (await send(command('holidays', { year: 2026, month: 10 }))).json()) as any
    expect(body.type).toBe(4)
    expect(body.data.embeds[0].title).toBe('📅 2026년 10월 공휴일 3일')
    expect(body.data.embeds[0].description).toContain('한글날')
  })

  it('/연차추천', async () => {
    const body = (await (await send(command('vacation', { year: 2027, leave: 2 }))).json()) as any
    expect(body.data.embeds[0].description).toContain('9/11(토) ~ 9/19(일) · 9일')
  })

  it('/영업일, /날짜확인, /다음공휴일', async () => {
    const add = (await (await send(command('businessday', { date: '2026-09-23', days: 3 }))).json()) as any
    expect(add.data.embeds[0].description).toContain('2026년 9/30(수)')
    const check = (await (await send(command('check', { date: '2026-07-17' }))).json()) as any
    expect(check.data.embeds[0].description).toContain('제헌절')
    const next = (await (await send(command('next', { count: 2 }))).json()) as any
    expect(next.data.embeds[0].description.split('\n')).toHaveLength(2)
  })

  it('잘못된 입력은 본인에게만 보이는 오류', async () => {
    const body = (await (await send(command('check', { date: '2026-02-30' }))).json()) as any
    expect(body.data.flags).toBe(64)
    expect(body.data.content).toContain('올바른 날짜가 아닙니다')
  })

  it('명령어 정의는 디스코드 규칙을 지킨다', () => {
    for (const c of DISCORD_COMMANDS) {
      expect(c.name).toMatch(/^[a-z0-9_-]{1,32}$/)
      expect(c.name_localizations.ko).toMatch(/^[\p{L}\p{N}_-]{1,32}$/u)
      expect(c.description.length).toBeLessThanOrEqual(100)
      for (const o of c.options) expect(o.name).toMatch(/^[a-z0-9_-]{1,32}$/)
    }
  })
})
