// 공공데이터포털(한국천문연구원) 특일정보와 우리 데이터를 비교하는 순수 함수들. 테스트하기 쉽게 입출력과 분리했다.
import { HOLIDAYS } from '../src/data/holidays.ts'

export interface OfficialHoliday {
  date: string
  name: string
}

export interface YearDiff {
  year: number
  supported: boolean
  /** 공식 데이터에는 있는데 우리 데이터에 없는 날 */
  missing: OfficialHoliday[]
  /** 우리 데이터에만 있는 날 */
  extra: OfficialHoliday[]
}

interface RestDeItem {
  dateName: string
  isHoliday: string
  locdate: number | string
}

/** getRestDeInfo 의 JSON 응답에서 휴일(isHoliday=Y)만 뽑는다. item 이 하나면 배열이 아니고, 없으면 빈 문자열이다. */
export function parseRestDeInfo(body: unknown): OfficialHoliday[] {
  const response = (body as { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: unknown } } })
    .response
  if (response?.header?.resultCode !== '00') {
    throw new Error(`특일정보 API 오류: ${response?.header?.resultCode ?? '?'} ${response?.header?.resultMsg ?? ''}`)
  }
  const raw = (response.body?.items as { item?: RestDeItem | RestDeItem[] } | '' | undefined) || undefined
  const items = raw?.item === undefined ? [] : Array.isArray(raw.item) ? raw.item : [raw.item]
  return items
    .filter((i) => i.isHoliday === 'Y')
    .map((i) => {
      const d = String(i.locdate)
      return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, name: String(i.dateName).trim() }
    })
}

export function diffYear(year: number, official: readonly OfficialHoliday[]): YearDiff {
  const ours = HOLIDAYS[year]
  if (!ours) return { year, supported: false, missing: [...official], extra: [] }
  const ourDates = new Set(ours.map((h) => h.date))
  const officialDates = new Set(official.map((h) => h.date))
  const unique = (list: readonly OfficialHoliday[]) => [...new Map(list.map((h) => [h.date, h])).values()]
  return {
    year,
    supported: true,
    missing: unique(official.filter((h) => !ourDates.has(h.date))),
    extra: unique(ours.filter((h) => !officialDates.has(h.date)).map((h) => ({ date: h.date, name: h.name }))),
  }
}

/** 확인이 필요한 차이가 있는지. 아직 지원하지 않는 연도는 공식 데이터가 나왔을 때만 알린다. */
export function hasMismatch(diff: YearDiff): boolean {
  return diff.supported ? diff.missing.length > 0 || diff.extra.length > 0 : diff.missing.length > 0
}

export function formatReport(diffs: readonly YearDiff[]): string {
  const lines = ['공공데이터포털 특일정보(한국천문연구원)와 `src/data/holidays.ts` 를 비교한 결과입니다.', '']
  for (const diff of diffs.filter(hasMismatch)) {
    lines.push(`## ${diff.year}년`, '')
    if (!diff.supported) {
      lines.push(`공식 데이터가 ${diff.missing.length}건 올라왔는데 아직 지원하지 않는 연도입니다. 데이터 추가가 필요합니다.`, '')
      for (const h of diff.missing) lines.push(`- ${h.date} ${h.name}`)
      lines.push('')
      continue
    }
    if (diff.missing.length) {
      lines.push('**공식 데이터에만 있음 (추가 필요?)**', '')
      for (const h of diff.missing) lines.push(`- ${h.date} ${h.name}`)
      lines.push('')
    }
    if (diff.extra.length) {
      lines.push('**우리 데이터에만 있음 (삭제 필요?)**', '')
      for (const h of diff.extra) lines.push(`- ${h.date} ${h.name}`)
      lines.push('')
    }
  }
  lines.push('> 공식 데이터는 임시공휴일 지정 후 반영까지 시간이 걸릴 수 있습니다. 정부 발표와 함께 확인해 주세요.')
  return lines.join('\n')
}
