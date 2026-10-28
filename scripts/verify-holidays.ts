// 사용법: DATA_GO_KR_SERVICE_KEY=... node scripts/verify-holidays.ts [report.md]
// 올해와 내년 공휴일을 공공데이터포털 특일정보와 비교한다. 차이가 있으면 리포트를 쓰고 GitHub Actions 출력 mismatch=true 를 남긴다.
import { appendFileSync, writeFileSync } from 'node:fs'
import { diffYear, formatReport, hasMismatch, parseRestDeInfo, type OfficialHoliday } from './verify-lib.ts'

const ENDPOINT = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo'

function setOutput(name: string, value: string): void {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
}

async function fetchYear(serviceKey: string, year: number): Promise<OfficialHoliday[]> {
  const result: OfficialHoliday[] = []
  for (let month = 1; month <= 12; month++) {
    const params = new URLSearchParams({
      ServiceKey: serviceKey,
      solYear: String(year),
      solMonth: String(month).padStart(2, '0'),
      numOfRows: '50',
      _type: 'json',
    })
    const res = await fetch(`${ENDPOINT}?${params}`)
    const text = await res.text()
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      // 키가 틀리면 _type=json 이어도 XML 오류가 온다
      throw new Error(`${year}-${month}: JSON 이 아닌 응답 (HTTP ${res.status}): ${text.slice(0, 300)}`)
    }
    result.push(...parseRestDeInfo(body))
  }
  return result
}

const rawKey = process.env.DATA_GO_KR_SERVICE_KEY
if (!rawKey) {
  console.log('::warning::DATA_GO_KR_SERVICE_KEY 시크릿이 없어 공휴일 데이터 검증을 건너뜁니다')
  setOutput('mismatch', 'false')
  process.exit(0)
}
// 포털의 "인코딩" 키를 넣어도 동작하도록 한 번 풀어 둔다 (URLSearchParams 가 다시 인코딩한다)
const serviceKey = rawKey.includes('%') ? decodeURIComponent(rawKey) : rawKey

const thisYear = new Date(Date.now() + 9 * 3_600_000).getUTCFullYear()
const diffs = []
for (const year of [thisYear, thisYear + 1]) {
  const official = await fetchYear(serviceKey, year)
  const diff = diffYear(year, official)
  console.log(`${year}: 공식 ${official.length}건, 누락 ${diff.missing.length}건, 초과 ${diff.extra.length}건`)
  diffs.push(diff)
}

const mismatch = diffs.some(hasMismatch)
if (mismatch) {
  const report = formatReport(diffs)
  writeFileSync(process.argv[2] ?? 'report.md', report)
  console.log(report)
}
setOutput('mismatch', String(mismatch))
