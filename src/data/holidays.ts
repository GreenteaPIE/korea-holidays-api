/**
 * 대한민국 관공서 공휴일 데이터.
 *
 * 근거: 「공휴일에 관한 법률」, 「관공서의 공휴일에 관한 규정」, 각 연도 임시공휴일 지정 공고.
 * 2026년부터 노동절(5/1)·제헌절(7/17)이 공휴일로 추가되었다 (대통령령 제36290호, 2026.5.1. 시행).
 *
 * 새 연도를 추가할 때는 한국천문연구원 특일 정보와 인사혁신처 발표를 기준으로 하고,
 * 공식 발표 전 연도는 PROVISIONAL_YEARS 에 넣는다.
 */

export type HolidayType = 'national' | 'substitute' | 'temporary' | 'election' | 'observance'

export interface Holiday {
  /** YYYY-MM-DD */
  date: string
  name: string
  nameEn: string
  type: HolidayType
}

const n = (date: string, name: string, nameEn: string): Holiday => ({ date, name, nameEn, type: 'national' })
const sub = (date: string, of: string, ofEn: string): Holiday => ({
  date,
  name: `대체공휴일(${of})`,
  nameEn: `Substitute Holiday (${ofEn})`,
  type: 'substitute',
})
const temp = (date: string, name: string, nameEn: string): Holiday => ({ date, name, nameEn, type: 'temporary' })
const election = (date: string, name: string, nameEn: string): Holiday => ({ date, name, nameEn, type: 'election' })

const seollal = (eve: string, day: string, after: string): Holiday[] => [
  n(eve, '설날 전날', "Day before Seollal"),
  n(day, '설날', 'Seollal (Lunar New Year)'),
  n(after, '설날 다음날', 'Day after Seollal'),
]
const chuseok = (eve: string, day: string, after: string): Holiday[] => [
  n(eve, '추석 전날', 'Day before Chuseok'),
  n(day, '추석', 'Chuseok'),
  n(after, '추석 다음날', 'Day after Chuseok'),
]

export const HOLIDAYS: Record<number, Holiday[]> = {
  2024: [
    n('2024-01-01', '신정', "New Year's Day"),
    ...seollal('2024-02-09', '2024-02-10', '2024-02-11'),
    sub('2024-02-12', '설날', 'Seollal'),
    n('2024-03-01', '삼일절', 'Independence Movement Day'),
    election('2024-04-10', '제22대 국회의원 선거일', '22nd National Assembly Election Day'),
    n('2024-05-05', '어린이날', "Children's Day"),
    sub('2024-05-06', '어린이날', "Children's Day"),
    n('2024-05-15', '부처님오신날', "Buddha's Birthday"),
    n('2024-06-06', '현충일', 'Memorial Day'),
    n('2024-08-15', '광복절', 'Liberation Day'),
    ...chuseok('2024-09-16', '2024-09-17', '2024-09-18'),
    temp('2024-10-01', '국군의 날', 'Armed Forces Day'),
    n('2024-10-03', '개천절', 'National Foundation Day'),
    n('2024-10-09', '한글날', 'Hangeul Day'),
    n('2024-12-25', '기독탄신일', 'Christmas Day'),
  ],
  2025: [
    n('2025-01-01', '신정', "New Year's Day"),
    temp('2025-01-27', '임시공휴일(설 연휴)', 'Temporary Holiday (Seollal)'),
    ...seollal('2025-01-28', '2025-01-29', '2025-01-30'),
    n('2025-03-01', '삼일절', 'Independence Movement Day'),
    sub('2025-03-03', '삼일절', 'Independence Movement Day'),
    n('2025-05-05', '어린이날', "Children's Day"),
    n('2025-05-05', '부처님오신날', "Buddha's Birthday"),
    sub('2025-05-06', '어린이날·부처님오신날', "Children's Day / Buddha's Birthday"),
    election('2025-06-03', '제21대 대통령 선거일', '21st Presidential Election Day'),
    n('2025-06-06', '현충일', 'Memorial Day'),
    n('2025-08-15', '광복절', 'Liberation Day'),
    n('2025-10-03', '개천절', 'National Foundation Day'),
    ...chuseok('2025-10-05', '2025-10-06', '2025-10-07'),
    sub('2025-10-08', '추석', 'Chuseok'),
    n('2025-10-09', '한글날', 'Hangeul Day'),
    n('2025-12-25', '기독탄신일', 'Christmas Day'),
  ],
  2026: [
    n('2026-01-01', '신정', "New Year's Day"),
    ...seollal('2026-02-16', '2026-02-17', '2026-02-18'),
    n('2026-03-01', '삼일절', 'Independence Movement Day'),
    sub('2026-03-02', '삼일절', 'Independence Movement Day'),
    n('2026-05-01', '노동절', 'Labor Day'),
    n('2026-05-05', '어린이날', "Children's Day"),
    n('2026-05-24', '부처님오신날', "Buddha's Birthday"),
    sub('2026-05-25', '부처님오신날', "Buddha's Birthday"),
    election('2026-06-03', '제9회 전국동시지방선거일', '9th Local Election Day'),
    n('2026-06-06', '현충일', 'Memorial Day'),
    n('2026-07-17', '제헌절', 'Constitution Day'),
    n('2026-08-15', '광복절', 'Liberation Day'),
    sub('2026-08-17', '광복절', 'Liberation Day'),
    ...chuseok('2026-09-24', '2026-09-25', '2026-09-26'),
    n('2026-10-03', '개천절', 'National Foundation Day'),
    sub('2026-10-05', '개천절', 'National Foundation Day'),
    n('2026-10-09', '한글날', 'Hangeul Day'),
    n('2026-12-25', '기독탄신일', 'Christmas Day'),
  ],
  2027: [
    n('2027-01-01', '신정', "New Year's Day"),
    ...seollal('2027-02-06', '2027-02-07', '2027-02-08'),
    sub('2027-02-09', '설날', 'Seollal'),
    n('2027-03-01', '삼일절', 'Independence Movement Day'),
    n('2027-05-01', '노동절', 'Labor Day'),
    sub('2027-05-03', '노동절', 'Labor Day'),
    n('2027-05-05', '어린이날', "Children's Day"),
    n('2027-05-13', '부처님오신날', "Buddha's Birthday"),
    n('2027-06-06', '현충일', 'Memorial Day'),
    n('2027-07-17', '제헌절', 'Constitution Day'),
    sub('2027-07-19', '제헌절', 'Constitution Day'),
    n('2027-08-15', '광복절', 'Liberation Day'),
    sub('2027-08-16', '광복절', 'Liberation Day'),
    ...chuseok('2027-09-14', '2027-09-15', '2027-09-16'),
    n('2027-10-03', '개천절', 'National Foundation Day'),
    sub('2027-10-04', '개천절', 'National Foundation Day'),
    n('2027-10-09', '한글날', 'Hangeul Day'),
    sub('2027-10-11', '한글날', 'Hangeul Day'),
    n('2027-12-25', '기독탄신일', 'Christmas Day'),
    sub('2027-12-27', '기독탄신일', 'Christmas Day'),
  ],
}

/** 정부 공식 발표(임시공휴일 지정 등) 전이라 바뀔 수 있는 연도 */
export const PROVISIONAL_YEARS: readonly number[] = [2027]

export const SUPPORTED_YEARS: readonly number[] = Object.keys(HOLIDAYS)
  .map(Number)
  .sort((a, b) => a - b)
