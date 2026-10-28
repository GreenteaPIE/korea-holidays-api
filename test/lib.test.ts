import { describe, expect, it } from 'vitest'
import * as lib from '../src/lib/index.ts'

describe('공개 라이브러리 API', () => {
  it('문자열을 받고 문자열을 돌려준다', () => {
    expect(lib.addBusinessDays('2026-09-23', 3)).toBe('2026-09-30')
    expect(lib.isHoliday('2026-07-17')).toBe(true)
    expect(lib.isBusinessDay('2026-07-16')).toBe(true)
  })

  it('Date 는 한국 시간 기준 날짜로 해석한다', () => {
    // 2026-10-08T15:30Z = 한국 시간 10/9 00:30 → 한글날
    expect(lib.getDayInfo(new Date('2026-10-08T15:30:00Z'))).toMatchObject({ date: '2026-10-09', isHoliday: true })
    // 2026-10-09T15:30Z = 한국 시간 10/10 00:30 → 토요일
    expect(lib.getDayInfo(new Date('2026-10-09T15:30:00Z'))).toMatchObject({ date: '2026-10-10', kind: 'weekend' })
  })

  it('잘못된 입력은 InvalidDateError', () => {
    expect(() => lib.isHoliday('2026-02-30')).toThrow(lib.InvalidDateError)
    expect(() => lib.isHoliday(new Date('nope'))).toThrow(lib.InvalidDateError)
  })

  it('지원 범위 밖은 OutOfRangeError', () => {
    expect(() => lib.isHoliday('2031-01-01')).toThrow(lib.OutOfRangeError)
  })
})

describe('급여일·정산일', () => {
  it('휴일이면 앞/뒤 영업일로 옮긴다', () => {
    expect(lib.adjustToBusinessDay('2026-10-25')).toBe('2026-10-23') // 일 → 금
    expect(lib.adjustToBusinessDay('2026-10-03', 'next')).toBe('2026-10-06') // 개천절·일·대체공휴일 건너뜀
    expect(lib.adjustToBusinessDay('2026-10-08')).toBe('2026-10-08') // 영업일은 그대로
  })

  it('modified 규칙은 달을 넘기지 않는다', () => {
    expect(lib.adjustToBusinessDay('2026-02-28', 'next')).toBe('2026-03-03')
    expect(lib.adjustToBusinessDay('2026-02-28', 'modified-next')).toBe('2026-02-27')
    expect(lib.adjustToBusinessDay('2026-03-01', 'modified-previous')).toBe('2026-03-03')
  })

  it('N번째 영업일과 월별 영업일', () => {
    expect(lib.nthBusinessDay(2026, 10, 1)).toBe('2026-10-01')
    expect(lib.nthBusinessDay(2026, 10, 5)).toBe('2026-10-08')
    expect(lib.nthBusinessDay(2026, 12, -1)).toBe('2026-12-31')
    expect(lib.nthBusinessDay(2026, 10, 30)).toBeNull()
    expect(lib.businessDaysInMonth(2026, 10)).toHaveLength(20)
    expect(lib.businessDaysInMonth(2026, 10, { weekend: 'sun' })).toHaveLength(24) // 토요일 5번 중 10/3 은 개천절
  })
})

describe('연차 발생', () => {
  it('근속 연수별 일수', () => {
    expect([1, 2, 3, 4, 5, 20, 21, 30].map(lib.annualLeaveDays)).toEqual([15, 15, 16, 16, 17, 24, 25, 25])
  })

  it('1년 미만은 매달 1일씩, 말일 입사는 말일로 맞춘다', () => {
    const r = lib.annualLeave('2026-01-31', '2026-04-15')
    expect(r.yearsOfService).toBe(0)
    expect(r.current).toEqual({ days: 2, kind: 'monthly', expires: '2027-01-30' })
    expect(r.schedule.slice(0, 3).map((g) => g.date)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
    expect(r.schedule.filter((g) => g.kind === 'monthly')).toHaveLength(11)
  })

  it('1년이 지나면 15일, 다음 연차 일정', () => {
    const r = lib.annualLeave('2024-03-02', '2026-10-28')
    expect(r.yearsOfService).toBe(2)
    expect(r.current).toEqual({ days: 15, kind: 'annual', expires: '2027-03-01' })
    expect(r.next).toMatchObject({ date: '2027-03-02', days: 16, serviceYear: 3 })
  })

  it('입사 1주년 당일에 15일이 생긴다', () => {
    expect(lib.annualLeave('2025-10-28', '2026-10-27').current.kind).toBe('monthly')
    expect(lib.annualLeave('2025-10-28', '2026-10-28').current).toMatchObject({ days: 15, kind: 'annual' })
  })

  it('기준일이 입사일보다 빠르면 오류', () => {
    expect(() => lib.annualLeave('2026-10-28', '2026-10-27')).toThrow(RangeError)
  })
})

describe('쇼핑몰 출고일', () => {
  const at = (iso: string) => new Date(iso)

  it('마감 전이면 당일, 마감 후면 다음 영업일', () => {
    // 2026-10-28(수) 13:00 KST
    expect(lib.shippingDate({ now: at('2026-10-28T04:00:00Z'), deliveryDays: 1 })).toEqual({
      orderedAt: '2026-10-28T13:00',
      cutoff: '14:00',
      beforeCutoff: true,
      shipDate: '2026-10-28',
      shipWeekday: '수',
      arrivalDate: '2026-10-29',
      arrivalWeekday: '목',
    })
    expect(lib.shippingDate({ now: at('2026-10-28T06:00:00Z') }).shipDate).toBe('2026-10-29')
  })

  it('연휴를 건너뛰고, 처리 기간을 더한다', () => {
    // 10/2(금) 15:00 → 10/3 개천절, 10/4 일, 10/5 대체공휴일 → 10/6
    expect(lib.shippingDate({ now: at('2026-10-02T06:00:00Z') }).shipDate).toBe('2026-10-06')
    expect(lib.shippingDate({ now: at('2026-10-02T06:00:00Z'), processingDays: 2 }).shipDate).toBe('2026-10-08')
    // 토요일 출고하는 가게: 한글날(금) 주문 → 10/10(토)
    expect(lib.shippingDate({ now: at('2026-10-09T03:00:00Z'), weekend: 'sun' }).shipDate).toBe('2026-10-10')
  })

  it('잘못된 마감 시각', () => {
    expect(() => lib.shippingDate({ cutoff: '25:00' })).toThrow(RangeError)
  })
})
