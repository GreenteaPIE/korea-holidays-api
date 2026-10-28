import { describe, expect, it } from 'vitest'
import { OutOfRangeError } from '../src/lib/calendar.ts'
import { longWeekends, vacationTips } from '../src/lib/vacation.ts'

describe('longWeekends', () => {
  it('2026년 3일 이상 연휴', () => {
    const list = longWeekends(2026)
    expect(list.map((l) => `${l.start}~${l.end}`)).toEqual([
      '2026-02-14~2026-02-18',
      '2026-02-28~2026-03-02',
      '2026-05-01~2026-05-03',
      '2026-05-23~2026-05-25',
      '2026-07-17~2026-07-19',
      '2026-08-15~2026-08-17',
      '2026-09-24~2026-09-27',
      '2026-10-03~2026-10-05',
      '2026-10-09~2026-10-11',
      '2026-12-25~2026-12-27',
    ])
    expect(list[0]).toMatchObject({ days: 5, holidays: ['설날 전날', '설날', '설날 다음날'] })
  })

  it('minDays 로 걸러낸다', () => {
    expect(longWeekends(2026, {}, 5).map((l) => l.start)).toEqual(['2026-02-14'])
  })

  it('토요일 영업이면 연휴가 짧아진다', () => {
    // 2026 추석 9/24~26(목~토) + 일요일: 토요일 영업이어도 26일은 추석이라 그대로 4일
    expect(longWeekends(2026, { weekend: 'sun' }).find((l) => l.start === '2026-09-24')?.days).toBe(4)
    // 2026 설 2/16~18(월~수): 토요일 영업이면 2/15(일)~2/18 4일
    expect(longWeekends(2026, { weekend: 'sun' })[0]).toMatchObject({ start: '2026-02-15', days: 4 })
  })

  it('지원하지 않는 연도', () => {
    expect(() => longWeekends(2030)).toThrow(OutOfRangeError)
  })
})

describe('vacationTips', () => {
  it('2027 추석: 연차 2일로 9일 휴가', () => {
    const [best] = vacationTips(2027, 2)
    expect(best).toEqual({
      start: '2027-09-11',
      end: '2027-09-19',
      days: 9,
      holidays: ['추석 전날', '추석', '추석 다음날'],
      leaveDates: ['2027-09-13', '2027-09-17'],
      efficiency: 4.5,
    })
  })

  it('긴 순서이고 겹치지 않으며 연차 한도를 지킨다', () => {
    const tips = vacationTips(2026, 3, {}, 10)
    expect(tips.length).toBeGreaterThan(3)
    for (let i = 1; i < tips.length; i++) {
      expect(tips[i]!.days).toBeLessThanOrEqual(tips[i - 1]!.days)
    }
    for (const t of tips) expect(t.leaveDates.length).toBeLessThanOrEqual(3)
    const sorted = [...tips].sort((a, b) => a.start.localeCompare(b.start))
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]!.start > sorted[i - 1]!.end).toBe(true)
  })

  it('연차 1일: 2026 설 앞 금요일', () => {
    expect(vacationTips(2026, 1, {}, 1)).toEqual([
      {
        start: '2026-02-13',
        end: '2026-02-18',
        days: 6,
        holidays: ['설날 전날', '설날', '설날 다음날'],
        leaveDates: ['2026-02-13'],
        efficiency: 6,
      },
    ])
  })

  it('include 로 추가한 휴일도 반영한다', () => {
    // 10/6~8 회사 휴일 → 10/3~10/11 이 통째로 쉬는 날이 되어, 연차 없이 이어진다
    const tips = vacationTips(2026, 1, { include: ['2026-10-06', '2026-10-07', '2026-10-08'] }, 20)
    expect(tips.some((t) => t.start <= '2026-10-03' && t.end >= '2026-10-11')).toBe(true)
  })
})
