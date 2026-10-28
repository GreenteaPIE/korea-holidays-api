import { describe, expect, it } from 'vitest'
import {
  OutOfRangeError,
  addBusinessDays,
  countBusinessDays,
  dayKind,
  getHolidays,
  holidaysOn,
  isBusinessDay,
  nextHolidays,
} from '../src/lib/calendar.ts'
import { formatDate, parseDate } from '../src/lib/date.ts'

const d = (s: string) => parseDate(s)!

describe('parseDate', () => {
  it('존재하지 않는 날짜와 잘못된 형식을 거른다', () => {
    expect(parseDate('2026-02-30')).toBeNull()
    expect(parseDate('2026-2-3')).toBeNull()
    expect(parseDate('20261009')).toBeNull()
    expect(parseDate('2028-02-29')).not.toBeNull()
  })
})

describe('holidaysOn / isBusinessDay', () => {
  it('한 날짜에 공휴일이 둘이면 모두 돌려준다', () => {
    expect(holidaysOn(d('2025-05-05')).map((h) => h.name)).toEqual(['어린이날', '부처님오신날'])
  })

  it('평일·주말·공휴일을 구분한다', () => {
    expect(isBusinessDay(d('2026-10-08'))).toBe(true) // 목
    expect(isBusinessDay(d('2026-10-10'))).toBe(false) // 토
    expect(isBusinessDay(d('2026-10-09'))).toBe(false) // 한글날
  })

  it('지원하지 않는 연도는 OutOfRangeError', () => {
    expect(() => holidaysOn(d('2014-12-31'))).toThrow(OutOfRangeError)
  })
})

describe('addBusinessDays', () => {
  it('추석 연휴와 주말을 건너뛴다', () => {
    expect(formatDate(addBusinessDays(d('2026-09-23'), 3))).toBe('2026-09-30')
  })

  it('음수면 과거로 계산한다', () => {
    // 10/5(월) 대체공휴일, 10/3~4 주말 → 10/2(금)
    expect(formatDate(addBusinessDays(d('2026-10-06'), -1))).toBe('2026-10-02')
  })

  it('0이면 시작일 그대로', () => {
    expect(formatDate(addBusinessDays(d('2026-10-09'), 0))).toBe('2026-10-09')
  })

  it('지원 범위를 넘어가면 OutOfRangeError', () => {
    expect(() => addBusinessDays(d('2027-12-30'), 5)).toThrow(OutOfRangeError)
  })
})

describe('countBusinessDays', () => {
  it('2026년 10월 영업일 수', () => {
    // 10/3 개천절(토)은 공휴일로 센다
    expect(countBusinessDays(d('2026-10-01'), d('2026-10-31'))).toEqual({
      totalDays: 31,
      businessDays: 20,
      weekendDays: 8,
      holidayDays: 3,
    })
  })

  it('하루짜리 기간', () => {
    expect(countBusinessDays(d('2026-10-09'), d('2026-10-09')).businessDays).toBe(0)
    expect(countBusinessDays(d('2026-10-08'), d('2026-10-08')).businessDays).toBe(1)
  })
})

describe('CalendarOptions', () => {
  it('weekend=sun 이면 토요일도 영업일', () => {
    expect(isBusinessDay(d('2026-10-10'), { weekend: 'sun' })).toBe(true)
    expect(isBusinessDay(d('2026-10-11'), { weekend: 'sun' })).toBe(false)
  })

  it('weekend=none 이면 공휴일만 쉰다', () => {
    expect(countBusinessDays(d('2026-10-01'), d('2026-10-31'), { weekend: 'none' })).toMatchObject({
      businessDays: 28,
      weekendDays: 0,
      holidayDays: 3,
    })
  })

  it('include 는 쉬는 날, exclude 는 일하는 날로 바꾼다', () => {
    expect(dayKind(d('2026-10-08'), { include: ['2026-10-08'] })).toBe('holiday')
    expect(dayKind(d('2026-05-01'), { exclude: ['2026-05-01'] })).toBe('business')
    // exclude 는 주말보다도 우선
    expect(dayKind(d('2026-10-10'), { exclude: ['2026-10-10'] })).toBe('business')
  })

  it('옵션을 영업일 계산에 반영한다', () => {
    // 10/8(목) 회사 휴일 → 10/7(수) + 1 영업일은 10/12(월)
    expect(formatDate(addBusinessDays(d('2026-10-07'), 1, { include: ['2026-10-08'] }))).toBe('2026-10-12')
  })
})

describe('getHolidays observances', () => {
  it('기념일은 요청할 때만 섞고 날짜순으로 정렬한다', () => {
    expect(getHolidays(2026).some((h) => h.type === 'observance')).toBe(false)
    const withObs = getHolidays(2026, { observances: true })
    expect(withObs.find((h) => h.date === '2026-05-08')).toMatchObject({ name: '어버이날', type: 'observance' })
    expect(withObs.map((h) => h.date)).toEqual([...withObs.map((h) => h.date)].sort())
  })

  it('공휴일이 된 해부터는 기념일 목록에서 빠진다', () => {
    const names = (y: number) => getHolidays(y, { observances: true }).filter((h) => h.type === 'observance').map((h) => h.name)
    expect(names(2025)).toEqual(expect.arrayContaining(['근로자의 날', '제헌절']))
    expect(names(2026)).not.toContain('제헌절')
    expect(names(2026)).not.toContain('근로자의 날')
    // 2024 국군의 날은 임시공휴일
    expect(names(2024)).not.toContain('국군의 날')
  })

  it('기념일은 영업일 계산에 영향이 없다', () => {
    expect(isBusinessDay(d('2026-05-08'))).toBe(true)
  })
})

describe('nextHolidays', () => {
  it('당일을 포함하고 연도를 넘어간다', () => {
    expect(nextHolidays(d('2026-12-25'), 2).map((h) => [h.date, h.daysUntil])).toEqual([
      ['2026-12-25', 0],
      ['2027-01-01', 7],
    ])
  })

  it('데이터 끝에 다다르면 있는 만큼만', () => {
    expect(nextHolidays(d('2027-12-26'), 5).map((h) => h.date)).toEqual(['2027-12-27'])
  })
})
