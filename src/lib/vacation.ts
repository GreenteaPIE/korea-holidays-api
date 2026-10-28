import { OutOfRangeError, dayKind, holidaysOn, isSupported, type CalendarOptions, type DayKind } from './calendar.ts'
import { addDays, formatDate } from './date.ts'

export interface LongWeekend {
  start: string
  end: string
  days: number
  /** 기간에 걸린 공휴일 이름 (중복 제거) */
  holidays: string[]
}

export interface VacationTip extends LongWeekend {
  /** 연차를 써야 하는 날 */
  leaveDates: string[]
  /** 연차 하루당 쉬는 날 수 */
  efficiency: number
}

const isOff = (date: Date, options: CalendarOptions) => isSupported(date) && dayKind(date, options) !== 'business'

function holidayNames(start: Date, end: Date): string[] {
  const names = new Set<string>()
  for (let d = start; d <= end; d = addDays(d, 1)) {
    for (const h of holidaysOn(d)) names.add(h.name)
  }
  return [...names]
}

function hasHoliday(start: Date, end: Date, options: CalendarOptions): boolean {
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (dayKind(d, options) === 'holiday') return true
  }
  return false
}

function yearBounds(year: number): [Date, Date] {
  const first = new Date(Date.UTC(year, 0, 1))
  if (!isSupported(first)) throw new OutOfRangeError(year)
  return [first, new Date(Date.UTC(year, 11, 31))]
}

/**
 * 해당 연도에 시작하는, 쉬는 날이 minDays 일 이상 이어지는 연휴 목록.
 * 공휴일(또는 include 로 추가한 휴일)이 하루 이상 끼어 있어야 하며, 연말 연휴는 다음 해 데이터가 있으면 이어서 센다.
 */
export function longWeekends(year: number, options: CalendarOptions = {}, minDays = 3): LongWeekend[] {
  const [first, last] = yearBounds(year)
  const result: LongWeekend[] = []
  let d = first
  // 1월 1일이 작년부터 이어진 연휴의 일부면 작년 목록에 속하므로 건너뛴다
  while (d <= last && isOff(d, options) && isOff(addDays(d, -1), options)) d = addDays(d, 1)

  while (d <= last) {
    if (!isOff(d, options)) {
      d = addDays(d, 1)
      continue
    }
    const start = d
    let end = d
    while (isOff(addDays(end, 1), options)) end = addDays(end, 1)
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
    if (days >= minDays && hasHoliday(start, end, options)) {
      result.push({ start: formatDate(start), end: formatDate(end), days, holidays: holidayNames(start, end) })
    }
    d = addDays(end, 1)
  }
  return result
}

const MAX_SPAN_DAYS = 45

/**
 * 연차 leaveDays 일 이하로 만들 수 있는 가장 긴 휴가 조합.
 * 공휴일이 하나 이상 낀 기간만 추천하며, 겹치지 않게 긴 순서(같으면 연차를 덜 쓰는 순)로 최대 limit 개를 고른다.
 * 결과도 추천 순서(긴 순)로 돌려준다.
 */
export function vacationTips(year: number, leaveDays: number, options: CalendarOptions = {}, limit = 5): VacationTip[] {
  const [first, last] = yearBounds(year)
  // Workers CPU 시간 제한 때문에 날짜 구분을 한 번만 계산해 둔다. index 0 은 1월 1일 전날.
  const origin = addDays(first, -1)
  const lastIndex = Math.round((last.getTime() - origin.getTime()) / 86_400_000)
  const kinds: (DayKind | null)[] = []
  for (let i = 0; i <= lastIndex + MAX_SPAN_DAYS + 1; i++) {
    const date = addDays(origin, i)
    kinds.push(isSupported(date) ? dayKind(date, options) : null)
  }
  const off = (i: number) => kinds[i] != null && kinds[i] !== 'business'
  const holidayPrefix = [0]
  for (const kind of kinds) holidayPrefix.push(holidayPrefix.at(-1)! + (kind === 'holiday' ? 1 : 0))

  const candidates: { start: number; end: number; leave: number[] }[] = []
  for (let start = 1; start <= lastIndex; start++) {
    // 앞날도 쉬는 날이면 거기서 시작하는 게 더 길다
    if (off(start - 1)) continue
    const leave: number[] = []
    for (let end = start; end < start + MAX_SPAN_DAYS && kinds[end] != null; end++) {
      if (!off(end)) {
        leave.push(end)
        if (leave.length > leaveDays) break
      }
      // 다음 날이 영업일(또는 데이터 밖)인 지점에서만 끊어야 쉬는 날을 버리지 않는다
      if (leave.length > 0 && !off(end + 1) && holidayPrefix[end + 1]! - holidayPrefix[start]! > 0) {
        candidates.push({ start, end, leave: [...leave] })
      }
    }
  }

  const length = (c: (typeof candidates)[number]) => c.end - c.start + 1
  candidates.sort((a, b) => length(b) - length(a) || a.leave.length - b.leave.length || a.start - b.start)

  const picked: typeof candidates = []
  for (const c of candidates) {
    if (picked.length >= limit) break
    if (picked.some((p) => c.start <= p.end && p.start <= c.end)) continue
    picked.push(c)
  }

  const toDate = (i: number) => addDays(origin, i)
  return picked.map((c) => ({
    start: formatDate(toDate(c.start)),
    end: formatDate(toDate(c.end)),
    days: length(c),
    holidays: holidayNames(toDate(c.start), toDate(c.end)),
    leaveDates: c.leave.map((i) => formatDate(toDate(i))),
    efficiency: Math.round((length(c) / c.leave.length) * 10) / 10,
  }))
}
