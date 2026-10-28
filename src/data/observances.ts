import type { Holiday } from './holidays.ts'

/**
 * 쉬지 않는 법정 기념일. 영업일 계산에는 영향을 주지 않고, 요청할 때만 목록에 함께 보여준다.
 * 근거: 「각종 기념일 등에 관한 규정」 및 개별 법률.
 */
interface ObservanceRule {
  /** MM-DD */
  md: string
  name: string
  nameEn: string
  /** 이 연도까지만 기념일 (이후 공휴일이 된 경우) */
  until?: number
  /** 공휴일로 지정되어 기념일 목록에서 빼야 하는 연도 */
  skip?: readonly number[]
}

const RULES: readonly ObservanceRule[] = [
  { md: '04-05', name: '식목일', nameEn: 'Arbor Day' },
  { md: '05-01', name: '근로자의 날', nameEn: "Workers' Day", until: 2025 },
  { md: '05-08', name: '어버이날', nameEn: "Parents' Day" },
  { md: '05-15', name: '스승의 날', nameEn: "Teachers' Day" },
  { md: '06-25', name: '6·25전쟁일', nameEn: 'Korean War Day' },
  { md: '07-17', name: '제헌절', nameEn: 'Constitution Day', until: 2025 },
  { md: '10-01', name: '국군의 날', nameEn: 'Armed Forces Day', skip: [2024] },
]

export function observancesOf(year: number): Holiday[] {
  return RULES.filter((r) => (r.until === undefined || year <= r.until) && !r.skip?.includes(year)).map((r) => ({
    date: `${year}-${r.md}`,
    name: r.name,
    nameEn: r.nameEn,
    type: 'observance',
  }))
}
