// 날짜는 시간대 영향을 받지 않도록 모두 UTC 자정 기준 Date 로 다룬다.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const

export function parseDate(value: string): Date | null {
  const m = DATE_RE.exec(value)
  if (!m) return null
  const [, y, mo, d] = m.map(Number) as [number, number, number, number]
  const date = new Date(Date.UTC(y, mo - 1, d))
  // 2026-02-30 같은 존재하지 않는 날짜 거르기
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null
  return date
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

export function weekdayKo(date: Date): string {
  return WEEKDAYS_KO[date.getUTCDay()]!
}
