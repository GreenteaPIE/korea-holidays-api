// Python 패키지가 쓰는 공휴일 JSON. TypeScript 데이터가 원본이고, 이 파일로 만든 결과를 python/ 에 넣는다.
import { HOLIDAYS, PROVISIONAL_YEARS, SUPPORTED_YEARS } from '../src/data/holidays.ts'
import { observancesOf } from '../src/data/observances.ts'

export const PYTHON_DATA_PATH = 'python/src/korea_holidays/holidays.json'

export function pythonData(): string {
  const data = {
    $comment: '자동 생성 파일입니다. src/data 를 고친 뒤 npm run export:python 으로 다시 만드세요.',
    provisional: PROVISIONAL_YEARS,
    holidays: Object.fromEntries(SUPPORTED_YEARS.map((y) => [y, HOLIDAYS[y]])),
    observances: Object.fromEntries(SUPPORTED_YEARS.map((y) => [y, observancesOf(y)])),
  }
  return JSON.stringify(data, null, 1) + '\n'
}
