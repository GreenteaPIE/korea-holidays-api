import { HOLIDAYS, PROVISIONAL_YEARS, SUPPORTED_YEARS, type Holiday } from '../data/holidays.ts'
import { observancesOf } from '../data/observances.ts'
import { addDays, formatDate } from './date.ts'

/** 데이터가 없는 연도의 날짜를 계산하려 할 때 발생 */
export class OutOfRangeError extends Error {
  readonly year: number
  constructor(year: number) {
    super(`${year}년 데이터는 아직 지원하지 않습니다. 지원 연도: ${SUPPORTED_YEARS.join(', ')}`)
    this.name = 'OutOfRangeError'
    this.year = year
  }
}

/**
 * - sat-sun: 토·일 휴무 (기본값)
 * - sun: 일요일만 휴무 (토요일 영업 업종)
 * - none: 주말 구분 없음 (공휴일만 휴무)
 */
export type WeekendMode = 'sat-sun' | 'sun' | 'none'

export interface CalendarOptions {
  weekend?: WeekendMode
  /** 추가로 쉬는 날 (회사 창립기념일 등), YYYY-MM-DD */
  include?: readonly string[]
  /** 주말·공휴일이어도 일하는 날 (노동절 출근 등), YYYY-MM-DD */
  exclude?: readonly string[]
}

const holidaysByDate = new Map<string, Holiday[]>()
for (const holiday of Object.values(HOLIDAYS).flat()) {
  const list = holidaysByDate.get(holiday.date) ?? []
  list.push(holiday)
  holidaysByDate.set(holiday.date, list)
}

export function isSupported(date: Date): boolean {
  return date.getUTCFullYear() in HOLIDAYS
}

function assertSupported(date: Date): void {
  if (!isSupported(date)) throw new OutOfRangeError(date.getUTCFullYear())
}

export function isProvisional(year: number): boolean {
  return PROVISIONAL_YEARS.includes(year)
}

export function getHolidays(year: number, { observances = false } = {}): Holiday[] {
  const holidays = HOLIDAYS[year]
  if (!holidays) throw new OutOfRangeError(year)
  if (!observances) return holidays
  // 정렬 안정성 덕분에 같은 날짜면 공휴일이 기념일보다 앞에 온다
  return [...holidays, ...observancesOf(year)].sort((a, b) => a.date.localeCompare(b.date))
}

/** 해당 날짜의 공휴일 목록. 2025-05-05 처럼 한 날짜에 둘 이상일 수 있다. */
export function holidaysOn(date: Date): Holiday[] {
  assertSupported(date)
  return holidaysByDate.get(formatDate(date)) ?? []
}

export function isWeekendDay(date: Date, mode: WeekendMode = 'sat-sun'): boolean {
  const day = date.getUTCDay()
  if (mode === 'none') return false
  if (mode === 'sun') return day === 0
  return day === 0 || day === 6
}

export type DayKind = 'business' | 'weekend' | 'holiday'

/** 옵션을 반영한 날짜 구분. exclude 가 가장 우선이고, 그다음 공휴일·include, 마지막이 주말이다. */
export function dayKind(date: Date, options: CalendarOptions = {}): DayKind {
  assertSupported(date)
  const key = formatDate(date)
  if (options.exclude?.includes(key)) return 'business'
  if (holidaysByDate.has(key) || options.include?.includes(key)) return 'holiday'
  if (isWeekendDay(date, options.weekend)) return 'weekend'
  return 'business'
}

export function isBusinessDay(date: Date, options: CalendarOptions = {}): boolean {
  return dayKind(date, options) === 'business'
}

/**
 * date 로부터 영업일 기준 days 일 뒤(음수면 앞)의 날짜.
 * 시작일은 세지 않으며, days 가 0 이면 시작일을 그대로 돌려준다.
 */
export function addBusinessDays(date: Date, days: number, options: CalendarOptions = {}): Date {
  assertSupported(date)
  const step = days < 0 ? -1 : 1
  let current = date
  let remaining = Math.abs(days)
  while (remaining > 0) {
    current = addDays(current, step)
    if (isBusinessDay(current, options)) remaining--
  }
  return current
}

export interface DayCount {
  totalDays: number
  businessDays: number
  /** 주말 수 (주말과 겹친 공휴일은 holidayDays 로 센다) */
  weekendDays: number
  /** 공휴일·추가 휴일 수 */
  holidayDays: number
}

/** from ~ to (양 끝 포함) 기간의 영업일 수 */
export function countBusinessDays(from: Date, to: Date, options: CalendarOptions = {}): DayCount {
  assertSupported(from)
  assertSupported(to)
  const count: DayCount = { totalDays: 0, businessDays: 0, weekendDays: 0, holidayDays: 0 }
  for (let d = from; d <= to; d = addDays(d, 1)) {
    count.totalDays++
    const kind = dayKind(d, options)
    if (kind === 'business') count.businessDays++
    else if (kind === 'weekend') count.weekendDays++
    else count.holidayDays++
  }
  return count
}

export interface UpcomingHoliday extends Holiday {
  daysUntil: number
}

/** from 당일을 포함해 그 이후의 공휴일을 가까운 순으로 최대 count 개 */
export function nextHolidays(from: Date, count: number): UpcomingHoliday[] {
  assertSupported(from)
  const key = formatDate(from)
  return SUPPORTED_YEARS.flatMap((y) => HOLIDAYS[y]!)
    .filter((h) => h.date >= key)
    .slice(0, count)
    .map((h) => ({ ...h, daysUntil: Math.round((Date.parse(h.date) - from.getTime()) / 86_400_000) }))
}
