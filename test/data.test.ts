import { describe, expect, it } from 'vitest'
import { HOLIDAYS } from '../src/data/holidays'
import { isWeekend, parseDate } from '../src/lib/date'

describe('공휴일 데이터 무결성', () => {
  for (const [year, holidays] of Object.entries(HOLIDAYS)) {
    describe(`${year}년`, () => {
      it('모든 날짜가 올바르고 해당 연도에 속한다', () => {
        for (const h of holidays) {
          expect(parseDate(h.date), h.date).not.toBeNull()
          expect(h.date.startsWith(`${year}-`), h.date).toBe(true)
        }
      })

      it('날짜순으로 정렬되어 있다', () => {
        const dates = holidays.map((h) => h.date)
        expect(dates).toEqual([...dates].sort())
      })

      it('대체공휴일은 평일이고 다른 공휴일과 겹치지 않는다', () => {
        for (const h of holidays.filter((h) => h.type === 'substitute')) {
          expect(isWeekend(parseDate(h.date)!), h.date).toBe(false)
          expect(holidays.filter((o) => o.date === h.date)).toHaveLength(1)
        }
      })
    })
  }

  it('2026년부터 노동절·제헌절이 공휴일이다', () => {
    expect(HOLIDAYS[2025]!.some((h) => h.name === '노동절' || h.name === '제헌절')).toBe(false)
    expect(HOLIDAYS[2026]!.map((h) => h.name)).toEqual(expect.arrayContaining(['노동절', '제헌절']))
  })

  it('요일 기준 대체공휴일이 맞게 들어가 있다', () => {
    // 2026-08-15 광복절(토) → 8/17(월) 대체
    expect(parseDate('2026-08-15')!.getUTCDay()).toBe(6)
    expect(HOLIDAYS[2026]!.find((h) => h.date === '2026-08-17')?.type).toBe('substitute')
    // 2026 추석 9/24~26(목~토): 토요일은 명절 대체 사유가 아니므로 대체공휴일 없음
    expect(HOLIDAYS[2026]!.some((h) => h.type === 'substitute' && h.date.startsWith('2026-09'))).toBe(false)
  })
})
