import { describe, expect, it } from 'vitest'
import { buildIcs } from '../src/lib/ical.ts'
import { toIcs } from '../src/lib/index.ts'

const now = new Date('2026-10-28T00:00:00Z')

describe('buildIcs', () => {
  it('종일 일정과 필수 속성을 만든다', () => {
    const ics = buildIcs([{ date: '2026-12-31', summary: '연말, 휴무; 테스트', key: 'k' }], { name: '테스트', now })
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\n')
    expect(ics).toContain('DTEND;VALUE=DATE:20270101\r\n')
    expect(ics).toContain('DTSTAMP:20261028T000000Z\r\n')
    expect(ics).toContain('SUMMARY:연말\\, 휴무\\; 테스트\r\n')
  })

  it('UID 는 같은 입력이면 항상 같다', () => {
    const a = buildIcs([{ date: '2026-01-01', summary: 'a', key: 'same' }], { name: 'x', now })
    const b = buildIcs([{ date: '2026-01-01', summary: 'b', key: 'same' }], { name: 'x', now: new Date() })
    const uid = (s: string) => s.match(/UID:(.+)\r\n/)![1]
    expect(uid(a)).toBe(uid(b))
  })

  it('75바이트가 넘는 줄은 한글이 잘리지 않게 접는다', () => {
    const long = '대한민국'.repeat(20)
    const ics = buildIcs([{ date: '2026-01-01', summary: long, key: 'k' }], { name: 'x', now })
    const encoder = new TextEncoder()
    for (const line of ics.split('\r\n')) expect(encoder.encode(line).length).toBeLessThanOrEqual(75)
    const unfolded = ics.replace(/\r\n /g, '')
    expect(unfolded).toContain(`SUMMARY:${long}`)
  })
})

describe('toIcs', () => {
  const events = (ics: string) => ics.split('BEGIN:VEVENT').length - 1

  it('지원 연도 전체 공휴일이 들어간다', () => {
    const ics = toIcs({ now })
    expect(ics).toContain('SUMMARY:제헌절')
    expect(ics).toContain('DTSTART;VALUE=DATE:20240101')
    expect(ics).toContain('DTSTART;VALUE=DATE:20271227')
    expect(ics).not.toContain('어버이날')
  })

  it('옵션: 기념일, 회사 휴일, 제외, 영어', () => {
    const base = events(toIcs({ now }))
    expect(toIcs({ now, observances: true })).toContain('SUMMARY:어버이날')
    const custom = toIcs({ now, include: ['2026-03-15'], includeName: '창립기념일', exclude: ['2026-05-01'] })
    expect(custom).toContain('SUMMARY:창립기념일')
    expect(custom).not.toContain('DTSTART;VALUE=DATE:20260501')
    expect(events(custom)).toBe(base)
    expect(toIcs({ now, lang: 'en' })).toContain('SUMMARY:Constitution Day')
  })
})
