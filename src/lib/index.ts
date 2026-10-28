/**
 * korea-holidays: 대한민국 공휴일·영업일 계산 라이브러리.
 * 날짜는 'YYYY-MM-DD' 문자열 또는 Date 를 받으며, Date 는 한국 시간 기준 날짜로 해석한다. 결과 날짜는 'YYYY-MM-DD' 문자열이다.
 */
import { PROVISIONAL_YEARS, SUPPORTED_YEARS, type Holiday, type HolidayType } from '../data/holidays.ts'
import { calculateAnnualLeave, type AnnualLeave, type LeaveGrant } from './annual-leave.ts'
import * as calendar from './calendar.ts'
import type { AdjustRule, CalendarOptions, DayCount, DayKind, UpcomingHoliday, WeekendMode } from './calendar.ts'
import { formatDate, toCalendarDate, weekdayKo } from './date.ts'
import { buildIcs, type CalendarEvent } from './ical.ts'
import * as vacation from './vacation.ts'
import type { LongWeekend, VacationTip } from './vacation.ts'

export { annualLeaveDays } from './annual-leave.ts'
export { OutOfRangeError } from './calendar.ts'
export { InvalidDateError } from './date.ts'
export { PROVISIONAL_YEARS, SUPPORTED_YEARS }
export type {
  AdjustRule,
  AnnualLeave,
  LeaveGrant,
  CalendarEvent,
  CalendarOptions,
  DayCount,
  DayKind,
  Holiday,
  HolidayType,
  LongWeekend,
  UpcomingHoliday,
  VacationTip,
  WeekendMode,
}

export type DateInput = string | Date

export interface DayInfo {
  date: string
  weekday: string
  kind: DayKind
  isWeekend: boolean
  isHoliday: boolean
  isBusinessDay: boolean
  holidays: Holiday[]
}

export const isProvisional = calendar.isProvisional

export function getHolidays(year: number, options: { observances?: boolean } = {}): Holiday[] {
  return calendar.getHolidays(year, options)
}

export function getDayInfo(date: DateInput, options: CalendarOptions = {}): DayInfo {
  const d = toCalendarDate(date)
  const kind = calendar.dayKind(d, options)
  const holidays = calendar.holidaysOn(d)
  return {
    date: formatDate(d),
    weekday: weekdayKo(d),
    kind,
    isWeekend: calendar.isWeekendDay(d, options.weekend),
    isHoliday: holidays.length > 0,
    isBusinessDay: kind === 'business',
    holidays,
  }
}

export function isHoliday(date: DateInput): boolean {
  return calendar.holidaysOn(toCalendarDate(date)).length > 0
}

export function isBusinessDay(date: DateInput, options: CalendarOptions = {}): boolean {
  return calendar.isBusinessDay(toCalendarDate(date), options)
}

export function addBusinessDays(date: DateInput, days: number, options: CalendarOptions = {}): string {
  return formatDate(calendar.addBusinessDays(toCalendarDate(date), days, options))
}

export function countBusinessDays(from: DateInput, to: DateInput, options: CalendarOptions = {}): DayCount {
  return calendar.countBusinessDays(toCalendarDate(from), toCalendarDate(to), options)
}

/** 휴일이면 규칙에 따라 영업일로 옮긴 날짜 (급여일·결제일 계산) */
export function adjustToBusinessDay(date: DateInput, rule: AdjustRule = 'previous', options: CalendarOptions = {}): string {
  return formatDate(calendar.adjustToBusinessDay(toCalendarDate(date), rule, options))
}

/** 해당 월(1~12)의 영업일 목록 */
export function businessDaysInMonth(year: number, month: number, options: CalendarOptions = {}): string[] {
  return calendar.businessDaysInMonth(year, month, options).map(formatDate)
}

/** 해당 월의 n 번째 영업일 (음수면 뒤에서부터, -1 은 마지막 영업일). 없으면 null. */
export function nthBusinessDay(year: number, month: number, n: number, options: CalendarOptions = {}): string | null {
  const d = calendar.nthBusinessDay(year, month, n, options)
  return d ? formatDate(d) : null
}

/**
 * 입사일 기준 연차 개수 (근로기준법 제60조, 개근·출근율 80% 이상 가정).
 * asOf 기준으로 지금 연차, 다음에 생기는 연차, 연도별 일정을 돌려준다.
 */
export function annualLeave(hireDate: DateInput, asOf: DateInput = new Date()): AnnualLeave {
  return calculateAnnualLeave(toCalendarDate(hireDate), toCalendarDate(asOf))
}

export interface ShippingOptions extends CalendarOptions {
  /** 당일 출고 마감 시각 (한국 시간, HH:MM). 기본 '14:00' */
  cutoff?: string
  /** 출고까지 걸리는 영업일 (0 이면 당일 출고). 기본 0 */
  processingDays?: number
  /** 출고 후 도착까지 영업일. 주면 도착 예정일도 계산한다 */
  deliveryDays?: number
  /** 주문 시각. 기본 지금 */
  now?: Date
}

export interface ShippingDate {
  /** 주문 시각 (한국 시간, YYYY-MM-DDTHH:MM) */
  orderedAt: string
  cutoff: string
  /** 오늘 마감 안에 들어와 오늘부터 처리되는지 */
  beforeCutoff: boolean
  shipDate: string
  shipWeekday: string
  arrivalDate: string | null
  arrivalWeekday: string | null
}

/** 쇼핑몰 "지금 주문하면 언제 출고?" 계산. 마감 전·영업일이면 오늘부터, 아니면 다음 영업일부터 처리한다. */
export function shippingDate(options: ShippingOptions = {}): ShippingDate {
  const { cutoff = '14:00', processingDays = 0, deliveryDays, now = new Date(), ...calendarOptions } = options
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(cutoff)
  if (!match) throw new RangeError(`cutoff 는 HH:MM 형식이어야 합니다: ${cutoff}`)
  const kst = new Date(now.getTime() + 9 * 3_600_000)
  const today = toCalendarDate(now)
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes()
  const beforeCutoff = calendar.isBusinessDay(today, calendarOptions) && minutes < Number(match[1]) * 60 + Number(match[2])
  const start = beforeCutoff ? today : calendar.addBusinessDays(today, 1, calendarOptions)
  const ship = calendar.addBusinessDays(start, processingDays, calendarOptions)
  const arrival = deliveryDays === undefined ? null : calendar.addBusinessDays(ship, deliveryDays, calendarOptions)
  return {
    orderedAt: kst.toISOString().slice(0, 16),
    cutoff,
    beforeCutoff,
    shipDate: formatDate(ship),
    shipWeekday: weekdayKo(ship),
    arrivalDate: arrival ? formatDate(arrival) : null,
    arrivalWeekday: arrival ? weekdayKo(arrival) : null,
  }
}

export function nextHolidays(from: DateInput = new Date(), count = 1): UpcomingHoliday[] {
  return calendar.nextHolidays(toCalendarDate(from), count)
}

export function longWeekends(year: number, options: CalendarOptions = {}, minDays = 3): LongWeekend[] {
  return vacation.longWeekends(year, options, minDays)
}

export function vacationTips(year: number, leaveDays: number, options: CalendarOptions = {}, limit = 5): VacationTip[] {
  return vacation.vacationTips(year, leaveDays, options, limit)
}

export interface IcsCalendarOptions {
  /** 기념일(쉬지 않는 날)도 넣을지 */
  observances?: boolean
  /** 추가할 휴일 (회사 휴일 등) */
  include?: readonly string[]
  /** include 로 추가한 날의 일정 이름 */
  includeName?: string
  /** 목록에서 뺄 날짜 */
  exclude?: readonly string[]
  lang?: 'ko' | 'en'
  name?: string
  now?: Date
}

const TYPE_LABEL: Record<HolidayType, string> = {
  national: '법정 공휴일',
  substitute: '대체공휴일',
  temporary: '임시공휴일',
  election: '선거일',
  observance: '기념일 (휴일 아님)',
}

/** 지원하는 모든 연도의 공휴일을 iCalendar(.ics) 문자열로 */
export function toIcs(options: IcsCalendarOptions = {}): string {
  const { observances = false, include = [], includeName, exclude = [], lang = 'ko', now } = options
  const events: CalendarEvent[] = SUPPORTED_YEARS.flatMap((year) => calendar.getHolidays(year, { observances }))
    .filter((h) => !exclude.includes(h.date))
    .map((h) => ({
      date: h.date,
      summary: lang === 'en' ? h.nameEn : h.name,
      description: TYPE_LABEL[h.type],
      key: `${h.type}:${h.name}`,
    }))
  for (const date of include) {
    const summary = includeName ?? (lang === 'en' ? 'Company Holiday' : '회사 휴일')
    events.push({ date: formatDate(toCalendarDate(date)), summary, description: '사용자 지정 휴일', key: `custom:${summary}` })
  }
  events.sort((a, b) => a.date.localeCompare(b.date))
  return buildIcs(events, { name: options.name ?? (lang === 'en' ? 'Korean Public Holidays' : '대한민국 공휴일'), now })
}
