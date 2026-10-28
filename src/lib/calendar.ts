import { HOLIDAYS, PROVISIONAL_YEARS, SUPPORTED_YEARS, type Holiday } from '../data/holidays'
import { addDays, formatDate, isWeekend } from './date'

/** 데이터가 없는 연도의 날짜를 계산하려 할 때 발생 */
export class OutOfRangeError extends Error {
  constructor(readonly year: number) {
    super(`${year}년 데이터는 아직 지원하지 않습니다. 지원 연도: ${SUPPORTED_YEARS.join(', ')}`)
    this.name = 'OutOfRangeError'
  }
}

const holidaysByDate = new Map<string, Holiday[]>()
for (const holiday of Object.values(HOLIDAYS).flat()) {
  const list = holidaysByDate.get(holiday.date) ?? []
  list.push(holiday)
  holidaysByDate.set(holiday.date, list)
}

function assertSupported(date: Date): void {
  const year = date.getUTCFullYear()
  if (!(year in HOLIDAYS)) throw new OutOfRangeError(year)
}

export function isProvisional(year: number): boolean {
  return PROVISIONAL_YEARS.includes(year)
}

export function getHolidays(year: number): Holiday[] {
  const holidays = HOLIDAYS[year]
  if (!holidays) throw new OutOfRangeError(year)
  return holidays
}

/** 해당 날짜의 공휴일 목록. 2025-05-05 처럼 한 날짜에 둘 이상일 수 있다. */
export function holidaysOn(date: Date): Holiday[] {
  assertSupported(date)
  return holidaysByDate.get(formatDate(date)) ?? []
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && holidaysOn(date).length === 0
}

/**
 * date 로부터 영업일 기준 days 일 뒤(음수면 앞)의 날짜.
 * 시작일은 세지 않으며, days 가 0 이면 시작일을 그대로 돌려준다.
 */
export function addBusinessDays(date: Date, days: number): Date {
  assertSupported(date)
  const step = days < 0 ? -1 : 1
  let current = date
  let remaining = Math.abs(days)
  while (remaining > 0) {
    current = addDays(current, step)
    if (isBusinessDay(current)) remaining--
  }
  return current
}

export interface DayCount {
  totalDays: number
  businessDays: number
  weekendDays: number
  /** 평일에 걸린 공휴일 수 (주말과 겹친 공휴일은 weekendDays 에만 센다) */
  holidayDays: number
}

/** from ~ to (양 끝 포함) 기간의 영업일 수 */
export function countBusinessDays(from: Date, to: Date): DayCount {
  assertSupported(from)
  assertSupported(to)
  const count: DayCount = { totalDays: 0, businessDays: 0, weekendDays: 0, holidayDays: 0 }
  for (let d = from; d <= to; d = addDays(d, 1)) {
    count.totalDays++
    if (isWeekend(d)) count.weekendDays++
    else if (holidaysOn(d).length > 0) count.holidayDays++
    else count.businessDays++
  }
  return count
}
