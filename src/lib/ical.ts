// RFC 5545 iCalendar 생성. 공휴일은 종일 일정(DTSTART;VALUE=DATE)으로 넣는다.

export interface CalendarEvent {
  /** YYYY-MM-DD */
  date: string
  summary: string
  description?: string
  /** 같은 일정이 다시 내려받아져도 중복되지 않도록 쓰는 고정 ID 재료 */
  key: string
}

export interface IcsOptions {
  name: string
  /** 생성 시각. 테스트에서 고정하려고 받는다. */
  now?: Date
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

function utf8Length(codePoint: number): number {
  return codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4
}

/** 한 줄이 75 바이트를 넘으면 접는다. 한글이 중간에 잘리지 않도록 글자 단위로 자른다. */
function fold(line: string): string {
  // 대부분의 줄은 짧아서 접을 필요가 없다. 글자당 최대 4바이트이므로 18자 이하면 75바이트를 넘지 않는다.
  if (line.length <= 18) return line
  const parts: string[] = []
  let current = ''
  let bytes = 0
  for (const char of line) {
    const size = utf8Length(char.codePointAt(0)!)
    // 이어지는 줄은 앞에 공백 한 칸이 붙으므로 74 바이트까지
    const max = parts.length === 0 ? 75 : 74
    if (bytes + size > max) {
      parts.push(current)
      current = ''
      bytes = 0
    }
    current += char
    bytes += size
  }
  parts.push(current)
  return parts.join('\r\n ')
}

function compactDate(date: string): string {
  return date.replaceAll('-', '')
}

function nextDay(date: string): string {
  return new Date(Date.parse(date) + 86_400_000).toISOString().slice(0, 10)
}

/** FNV-1a (UTF-16 코드 단위). UID 를 짧고 고정되게 만들기 위한 용도라 충돌 저항성은 필요 없다. */
function hash(value: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function buildIcs(events: readonly CalendarEvent[], { name, now = new Date() }: IcsOptions): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//korea-holidays-api//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    'X-WR-TIMEZONE:Asia/Seoul',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:P1D',
  ]
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${compactDate(event.date)}-${hash(event.key)}@korea-holidays-api`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDay(event.date))}`,
      `SUMMARY:${escapeText(event.summary)}`,
    )
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)
    lines.push('TRANSP:TRANSPARENT', 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
