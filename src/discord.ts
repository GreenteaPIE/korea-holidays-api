/**
 * 디스코드 봇 (슬래시 명령어). 디스코드가 Interactions Endpoint URL 로 보낸 요청에 이 Worker 가 바로 답한다.
 * 상시 실행되는 봇 서버가 필요 없다. https://discord.com/developers/docs/interactions/overview
 *
 * 설정: DISCORD_PUBLIC_KEY (디스코드 개발자 포털 → General Information → Public Key)
 * 명령어 등록: scripts/discord-register.ts (또는 GitHub Actions 의 Register Discord Commands)
 */
import * as lib from './lib/index.ts'

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 } as const
const ResponseType = { PONG: 1, CHANNEL_MESSAGE: 4 } as const
const OptionType = { STRING: 3, INTEGER: 4 } as const
const EPHEMERAL = 1 << 6
const COLOR = 0xcd2e3a
const SITE = 'https://korea-holidays-api.greenteapie2023.workers.dev'

/** 디스코드에 등록할 명령어 정의. 이름은 영어, 한국어 클라이언트에서는 한국어 이름으로 보인다. */
export const DISCORD_COMMANDS = [
  {
    name: 'holidays',
    name_localizations: { ko: '공휴일' },
    description: 'Korean public holidays of a year',
    description_localizations: { ko: '연도별 공휴일 목록 (대체·임시공휴일 포함)' },
    options: [
      { type: OptionType.INTEGER, name: 'year', name_localizations: { ko: '연도' }, description: 'Year', description_localizations: { ko: '연도 (기본: 올해)' }, min_value: 2015, max_value: 2027 },
      { type: OptionType.INTEGER, name: 'month', name_localizations: { ko: '월' }, description: 'Month', description_localizations: { ko: '특정 월만 (1~12)' }, min_value: 1, max_value: 12 },
    ],
  },
  {
    name: 'next',
    name_localizations: { ko: '다음공휴일' },
    description: 'Upcoming Korean holidays',
    description_localizations: { ko: '다가오는 공휴일과 D-day' },
    options: [
      { type: OptionType.INTEGER, name: 'count', name_localizations: { ko: '개수' }, description: 'How many', description_localizations: { ko: '몇 개 (기본 3, 최대 10)' }, min_value: 1, max_value: 10 },
    ],
  },
  {
    name: 'vacation',
    name_localizations: { ko: '연차추천' },
    description: 'Best days to take leave',
    description_localizations: { ko: '연차로 만드는 최장 휴가 추천' },
    options: [
      { type: OptionType.INTEGER, name: 'leave', name_localizations: { ko: '연차일수' }, description: 'Leave days', description_localizations: { ko: '쓸 수 있는 연차 (기본 2)' }, min_value: 1, max_value: 5 },
      { type: OptionType.INTEGER, name: 'year', name_localizations: { ko: '연도' }, description: 'Year', description_localizations: { ko: '연도 (기본: 10월부터는 내년)' }, min_value: 2015, max_value: 2027 },
    ],
  },
  {
    name: 'businessday',
    name_localizations: { ko: '영업일' },
    description: 'Add business days to a date',
    description_localizations: { ko: '영업일 기준 N일 뒤 날짜' },
    options: [
      { type: OptionType.INTEGER, name: 'days', name_localizations: { ko: '일수' }, description: 'Business days', description_localizations: { ko: '더할 영업일 (음수면 앞으로)' }, required: true, min_value: -365, max_value: 365 },
      { type: OptionType.STRING, name: 'date', name_localizations: { ko: '날짜' }, description: 'Start date YYYY-MM-DD', description_localizations: { ko: '시작일 YYYY-MM-DD (기본: 오늘)' } },
    ],
  },
  {
    name: 'check',
    name_localizations: { ko: '날짜확인' },
    description: 'Is it a holiday or business day?',
    description_localizations: { ko: '공휴일·영업일인지 확인' },
    options: [
      { type: OptionType.STRING, name: 'date', name_localizations: { ko: '날짜' }, description: 'Date YYYY-MM-DD', description_localizations: { ko: 'YYYY-MM-DD (기본: 오늘)' } },
    ],
  },
]

// ---------- 서명 검증 ----------

function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(hex)) return new Uint8Array()
  return new Uint8Array(hex.match(/../g)!.map((b) => parseInt(b, 16)))
}

/** 디스코드는 모든 요청에 Ed25519 서명을 붙이고, 검증에 실패하면 401 을 기대한다 */
export async function verifyDiscordRequest(publicKeyHex: string, signature: string, timestamp: string, body: string) {
  try {
    const key = await crypto.subtle.importKey('raw', hexToBytes(publicKeyHex), { name: 'Ed25519' }, false, ['verify'])
    return await crypto.subtle.verify('Ed25519', key, hexToBytes(signature), new TextEncoder().encode(timestamp + body))
  } catch {
    return false
  }
}

// ---------- 명령어 처리 ----------

type Option = { name: string; value: string | number }
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const md = (date: string) => {
  const d = new Date(date + 'T00:00:00Z')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAYS[d.getUTCDay()]})`
}

const today = () => lib.getDayInfo(new Date()).date

const embed = (title: string, description: string, url?: string) => ({
  type: ResponseType.CHANNEL_MESSAGE,
  data: { embeds: [{ title, description, color: COLOR, ...(url ? { url } : {}) }] },
})

const error = (message: string) => ({
  type: ResponseType.CHANNEL_MESSAGE,
  data: { content: `⚠️ ${message}`, flags: EPHEMERAL },
})

function run(name: string, options: Record<string, string | number>) {
  switch (name) {
    case 'holidays': {
      const year = Number(options.year ?? today().slice(0, 4))
      const month = options.month ? String(options.month).padStart(2, '0') : null
      const list = lib.getHolidays(year).filter((h) => !month || h.date.slice(5, 7) === month)
      const lines = list.map((h) => `\`${md(h.date)}\` ${h.name}`)
      const title = `📅 ${year}년${month ? ` ${Number(month)}월` : ''} 공휴일 ${list.length}일${lib.isProvisional(year) ? ' (잠정)' : ''}`
      return embed(title, lines.join('\n') || '공휴일이 없어요', `${SITE}/holidays?year=${year}`)
    }
    case 'next': {
      const list = lib.nextHolidays(new Date(), Number(options.count ?? 3))
      const lines = list.map((h) => `\`${h.daysUntil === 0 ? '오늘' : `D-${h.daysUntil}`}\` ${md(h.date)} ${h.name}`)
      return embed('🗓️ 다가오는 공휴일', lines.join('\n') || '데이터가 없어요')
    }
    case 'vacation': {
      const now = today()
      const year = Number(options.year ?? (Number(now.slice(5, 7)) >= 10 ? Number(now.slice(0, 4)) + 1 : now.slice(0, 4)))
      const leave = Number(options.leave ?? 2)
      const tips = lib.vacationTips(year, leave, {}, 3)
      const lines = tips.map(
        (t, i) =>
          `${['🥇', '🥈', '🥉'][i]} **${md(t.start)} ~ ${md(t.end)} · ${t.days}일**\n　연차 ${t.leaveDates.map(md).join(', ')} · ${t.holidays.slice(0, 3).join(', ')}`,
      )
      return embed(
        `🏖️ ${year}년 연차 ${leave}일 꿀조합`,
        (lines.join('\n') || '추천할 조합이 없어요') + `\n\n[계산기에서 더 보기](${SITE}/vacation?year=${year}&leave=${leave})`,
      )
    }
    case 'businessday': {
      const date = String(options.date ?? today())
      const days = Number(options.days)
      const result = lib.addBusinessDays(date, days)
      return embed('💼 영업일 계산', `${md(date)} 부터 영업일 ${days}일 ${days < 0 ? '전' : '뒤'}는 **${result.slice(0, 4)}년 ${md(result)}** 입니다`)
    }
    case 'check': {
      const info = lib.getDayInfo(String(options.date ?? today()))
      const status = info.isHoliday ? `🎉 공휴일 (${info.holidays.map((h) => h.name).join(', ')})` : info.isWeekend ? '😴 주말' : '💼 영업일'
      return embed(`${info.date} (${info.weekday})`, status)
    }
    default:
      return error('알 수 없는 명령어예요')
  }
}

export async function handleDiscord(request: Request, publicKey: string | undefined): Promise<Response> {
  if (!publicKey) return new Response('Discord bot is not configured', { status: 503 })
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } })

  const body = await request.text()
  const valid = await verifyDiscordRequest(
    publicKey,
    request.headers.get('X-Signature-Ed25519') ?? '',
    request.headers.get('X-Signature-Timestamp') ?? '',
    body,
  )
  if (!valid) return new Response('invalid request signature', { status: 401 })

  const interaction = JSON.parse(body) as { type: number; data?: { name: string; options?: Option[] } }
  if (interaction.type === InteractionType.PING) return Response.json({ type: ResponseType.PONG })
  if (interaction.type !== InteractionType.APPLICATION_COMMAND || !interaction.data) {
    return Response.json(error('지원하지 않는 요청이에요'))
  }

  const options = Object.fromEntries((interaction.data.options ?? []).map((o) => [o.name, o.value]))
  try {
    return Response.json(run(interaction.data.name, options))
  } catch (err) {
    // 날짜 형식·지원 연도 오류는 사용자에게만 보이게 알려 준다
    if (err instanceof lib.OutOfRangeError || err instanceof lib.InvalidDateError || err instanceof RangeError) {
      return Response.json(error(err.message))
    }
    throw err
  }
}
