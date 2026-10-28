/**
 * korea-holidays: 대한민국 공휴일·영업일 계산 라이브러리.
 * 날짜는 'YYYY-MM-DD' 문자열 또는 Date 를 받으며, Date 는 한국 시간 기준 날짜로 해석한다. 결과 날짜는 'YYYY-MM-DD' 문자열이다.
 */
import { PROVISIONAL_YEARS, SUPPORTED_YEARS, type Holiday, type HolidayType } from '../data/holidays.ts'
import * as calendar from './calendar.ts'
import type { CalendarOptions, DayCount, DayKind, UpcomingHoliday, WeekendMode } from './calendar.ts'
import { formatDate, toCalendarDate, weekdayKo } from './date.ts'
import { buildIcs, type CalendarEvent } from './ical.ts'
import * as vacation from './vacation.ts'
import type { LongWeekend, VacationTip } from './vacation.ts'

export { OutOfRangeError } from './calendar.ts'
export { InvalidDateError } from './date.ts'
export { PROVISIONAL_YEARS, SUPPORTED_YEARS }
export type {
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
