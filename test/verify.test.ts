import { describe, expect, it } from 'vitest'
import { diffYear, formatReport, hasMismatch, parseRestDeInfo } from '../scripts/verify-lib.ts'

const response = (items: unknown) => ({ response: { header: { resultCode: '00', resultMsg: 'NORMAL SERVICE.' }, body: { items } } })

describe('parseRestDeInfo', () => {
  it('배열·단일·빈 응답을 모두 처리한다', () => {
    expect(
      parseRestDeInfo(
        response({
          item: [
            { dateName: '개천절', isHoliday: 'Y', locdate: 20261003 },
            { dateName: '대체공휴일', isHoliday: 'Y', locdate: 20261005 },
            { dateName: '어떤 기념일', isHoliday: 'N', locdate: 20261006 },
          ],
        }),
      ),
    ).toEqual([
      { date: '2026-10-03', name: '개천절' },
      { date: '2026-10-05', name: '대체공휴일' },
    ])
    expect(parseRestDeInfo(response({ item: { dateName: '신정', isHoliday: 'Y', locdate: 20260101 } }))).toEqual([
      { date: '2026-01-01', name: '신정' },
    ])
    expect(parseRestDeInfo(response(''))).toEqual([])
  })

  it('API 오류 코드면 예외', () => {
    expect(() => parseRestDeInfo({ response: { header: { resultCode: '30', resultMsg: 'SERVICE KEY IS NOT REGISTERED' } } })).toThrow(
      /30/,
    )
  })
})

describe('diffYear', () => {
  it('누락과 초과를 날짜 기준으로 찾는다', () => {
    const official = [
      { date: '2026-01-01', name: '1월1일' },
      { date: '2026-01-02', name: '임시공휴일' },
    ]
    const diff = diffYear(2026, official)
    expect(diff.missing).toEqual([{ date: '2026-01-02', name: '임시공휴일' }])
    expect(diff.extra.map((h) => h.date)).toContain('2026-12-25')
    expect(diff.extra.map((h) => h.date)).not.toContain('2026-01-01')
    expect(hasMismatch(diff)).toBe(true)
    expect(formatReport([diff])).toContain('2026-01-02 임시공휴일')
  })

  it('공식 데이터에 빠진 것으로 알려진 날은 초과로 잡지 않는다', () => {
    const official2015 = [{ date: '2015-01-01', name: '1월1일' }]
    expect(diffYear(2015, official2015).extra.map((h) => h.date)).not.toContain('2015-08-14')
  })

  it('지원하지 않는 연도는 공식 데이터가 있을 때만 알린다', () => {
    expect(hasMismatch(diffYear(2030, []))).toBe(false)
    const diff = diffYear(2030, [{ date: '2030-01-01', name: '1월1일' }])
    expect(hasMismatch(diff)).toBe(true)
    expect(formatReport([diff])).toContain('데이터 추가가 필요합니다')
  })
})
