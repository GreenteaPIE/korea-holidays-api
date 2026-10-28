import { describe, expect, it } from 'vitest'
import { OutOfRangeError, addBusinessDays, countBusinessDays, holidaysOn, isBusinessDay } from '../src/lib/calendar'
import { formatDate, parseDate } from '../src/lib/date'

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
    expect(() => holidaysOn(d('2023-12-31'))).toThrow(OutOfRangeError)
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
    expect(countBusinessDays(d('2026-10-01'), d('2026-10-31'))).toEqual({
      totalDays: 31,
      businessDays: 20,
      weekendDays: 9,
      holidayDays: 2,
    })
  })

  it('하루짜리 기간', () => {
    expect(countBusinessDays(d('2026-10-09'), d('2026-10-09')).businessDays).toBe(0)
    expect(countBusinessDays(d('2026-10-08'), d('2026-10-08')).businessDays).toBe(1)
  })
})
