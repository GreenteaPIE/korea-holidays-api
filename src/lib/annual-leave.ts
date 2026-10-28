/**
 * 입사일 기준 연차유급휴가 계산 (근로기준법 제60조).
 * - 1년 미만: 1개월 개근마다 1일, 최대 11일. 입사일로부터 1년 안에 써야 한다 (2020.3.31 개정).
 * - 1년 이상 (80% 이상 출근): 15일.
 * - 3년 이상: 최초 1년을 넘는 근속 2년마다 1일씩 더해 최대 25일.
 * 개근·출근율은 충족했다고 가정한다. 상시 5명 미만 사업장에는 적용되지 않는다.
 */
import { formatDate } from './date.ts'

export type LeaveGrantKind = 'monthly' | 'annual'

export interface LeaveGrant {
  /** 연차가 생기는 날 */
  date: string
  days: number
  kind: LeaveGrantKind
  /** 근속 연수 (monthly 는 0) */
  serviceYear: number
  /** 사용 기한 (이 날까지 사용) */
  expires: string
}

export interface AnnualLeave {
  hireDate: string
  asOf: string
  /** 기준일까지 채운 근속 연수 */
  yearsOfService: number
  /** 기준일에 쓸 수 있는 연차 (monthly 는 지금까지 생긴 일수 합) */
  current: { days: number; kind: LeaveGrantKind; expires: string }
  /** 기준일 다음에 생기는 연차 */
  next: LeaveGrant
  /** 1년 미만 월차 11번 + 근속 연수별 연차 */
  schedule: LeaveGrant[]
}

const MAX_DAYS = 25

/** 근속 n 년차(n >= 1)에 생기는 연차 일수 */
export function annualLeaveDays(serviceYear: number): number {
  return Math.min(MAX_DAYS, 15 + Math.floor((serviceYear - 1) / 2))
}

/** 말일 보정: 1/31 + 1개월 = 2/28(또는 29) */
function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + months
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), lastDay)))
}

const dayBefore = (date: Date) => new Date(date.getTime() - 86_400_000)

export function calculateAnnualLeave(hireDate: Date, asOf: Date, scheduleYears = 10): AnnualLeave {
  if (asOf < hireDate) throw new RangeError('기준일이 입사일보다 빠릅니다')
  const firstYearEnd = dayBefore(addMonths(hireDate, 12))

  const schedule: LeaveGrant[] = []
  for (let k = 1; k <= 11; k++) {
    schedule.push({
      date: formatDate(addMonths(hireDate, k)),
      days: 1,
      kind: 'monthly',
      serviceYear: 0,
      expires: formatDate(firstYearEnd),
    })
  }

  let yearsOfService = 0
  while (addMonths(hireDate, 12 * (yearsOfService + 1)) <= asOf) yearsOfService++

  // 기준일 이후로 몇 해를 더 보여준다. 25일에 다다르면 그 뒤는 같으므로 거기까지만.
  const lastYear = Math.max(yearsOfService + 1, scheduleYears)
  for (let n = 1; n <= lastYear; n++) {
    schedule.push({
      date: formatDate(addMonths(hireDate, 12 * n)),
      days: annualLeaveDays(n),
      kind: 'annual',
      serviceYear: n,
      expires: formatDate(dayBefore(addMonths(hireDate, 12 * (n + 1)))),
    })
    if (n > yearsOfService && annualLeaveDays(n) === MAX_DAYS) break
  }

  const asOfKey = formatDate(asOf)
  const current =
    yearsOfService === 0
      ? {
          days: schedule.filter((g) => g.kind === 'monthly' && g.date <= asOfKey).length,
          kind: 'monthly' as const,
          expires: formatDate(firstYearEnd),
        }
      : (() => {
          const grant = schedule.find((g) => g.kind === 'annual' && g.serviceYear === yearsOfService)!
          return { days: grant.days, kind: 'annual' as const, expires: grant.expires }
        })()

  return {
    hireDate: formatDate(hireDate),
    asOf: asOfKey,
    yearsOfService,
    current,
    next: schedule.find((g) => g.date > asOfKey)!,
    schedule,
  }
}
