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
