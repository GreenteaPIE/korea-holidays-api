/**
 * Korea Holidays — 구글 시트용 대한민국 공휴일·영업일 함수
 * https://github.com/GreenteaPIE/korea-holidays-api
 *
 * 연도별 공휴일 목록만 API 에서 받아 6시간 캐시하고, 계산은 시트 안에서 한다.
 * 그래서 수천 개 셀에 써도 API 호출은 연도당 한 번뿐이다.
 */

var KR_HOLIDAYS_API = 'https://korea-holidays-api.greenteapie2023.workers.dev'
var KR_TZ = 'Asia/Seoul'

/**
 * 공휴일이면 TRUE.
 *
 * @param {Date|string} date 날짜 (셀 또는 "2026-10-09"). 범위도 됩니다.
 * @return {boolean} 공휴일 여부
 * @customfunction
 */
function KR_ISHOLIDAY(date) {
  return krMap_(date, function (d) {
    return krHolidayNames_(d).length > 0
  })
}

/**
 * 공휴일 이름. 공휴일이 아니면 빈 칸.
 *
 * @param {Date|string} date 날짜. 범위도 됩니다.
 * @return {string} 공휴일 이름 (예: "한글날")
 * @customfunction
 */
function KR_HOLIDAYNAME(date) {
  return krMap_(date, function (d) {
    return krHolidayNames_(d).join(', ')
  })
}

/**
 * 영업일이면 TRUE (주말·공휴일이 아닌 날).
 *
 * @param {Date|string} date 날짜. 범위도 됩니다.
 * @param {string} weekend 휴무 요일: "sat-sun"(기본), "sun"(토요일 근무), "none"
 * @return {boolean} 영업일 여부
 * @customfunction
 */
function KR_ISBUSINESSDAY(date, weekend) {
  return krMap_(date, function (d) {
    return krIsBusinessDay_(d, weekend)
  })
}

/**
 * 영업일 기준 N일 뒤(음수면 앞) 날짜. 시작일은 세지 않습니다.
 *
 * @param {Date|string} date 시작 날짜
 * @param {number} days 더할 영업일 수 (음수 가능)
 * @param {string} weekend 휴무 요일: "sat-sun"(기본), "sun", "none"
 * @return {Date} 결과 날짜
 * @customfunction
 */
function KR_ADDBUSINESSDAYS(date, days, weekend) {
  var current = krDateString_(date)
  var step = days < 0 ? -1 : 1
  var remaining = Math.abs(Math.trunc(Number(days) || 0))
  while (remaining > 0) {
    current = krAddDays_(current, step)
    if (krIsBusinessDay_(current, weekend)) remaining--
  }
  return Utilities.parseDate(current, KR_TZ, 'yyyy-MM-dd')
}

/**
 * 기간(양 끝 포함) 안의 영업일 수.
 *
 * @param {Date|string} from 시작 날짜
 * @param {Date|string} to 끝 날짜
 * @param {string} weekend 휴무 요일: "sat-sun"(기본), "sun", "none"
 * @return {number} 영업일 수
 * @customfunction
 */
function KR_BUSINESSDAYS(from, to, weekend) {
  var start = krDateString_(from)
  var end = krDateString_(to)
  if (start > end) throw new Error('시작 날짜가 끝 날짜보다 늦습니다')
  var count = 0
  for (var d = start; d <= end; d = krAddDays_(d, 1)) {
    if (krIsBusinessDay_(d, weekend)) count++
  }
  return count
}

/**
 * 휴일이면 영업일로 옮긴 날짜 (급여일·결제일).
 *
 * @param {Date|string} date 원래 날짜
 * @param {string} rule "previous"(앞 영업일, 기본), "next"(뒤 영업일), "modified-previous", "modified-next"(달이 바뀌면 반대 방향)
 * @param {string} weekend 휴무 요일: "sat-sun"(기본), "sun", "none"
 * @return {Date} 영업일
 * @customfunction
 */
function KR_ADJUSTBUSINESSDAY(date, rule, weekend) {
  var original = krDateString_(date)
  var r = rule || 'previous'
  var move = function (step) {
    var d = original
    while (!krIsBusinessDay_(d, weekend)) d = krAddDays_(d, step)
    return d
  }
  var step = r === 'previous' || r === 'modified-previous' ? -1 : 1
  var moved = move(step)
  if (r.indexOf('modified-') === 0 && moved.slice(0, 7) !== original.slice(0, 7)) moved = move(-step)
  return Utilities.parseDate(moved, KR_TZ, 'yyyy-MM-dd')
}

/**
 * 그 달의 N번째 영업일 (정산일). N 이 음수면 뒤에서부터, -1 은 마지막 영업일.
 *
 * @param {number} year 연도
 * @param {number} month 월 (1~12)
 * @param {number} n 몇 번째
 * @param {string} weekend 휴무 요일: "sat-sun"(기본), "sun", "none"
 * @return {Date} 영업일
 * @customfunction
 */
function KR_NTHBUSINESSDAY(year, month, n, weekend) {
  var prefix = year + '-' + ('0' + month).slice(-2)
  var days = []
  for (var d = prefix + '-01'; d.slice(0, 7) === prefix; d = krAddDays_(d, 1)) {
    if (krIsBusinessDay_(d, weekend)) days.push(d)
  }
  var result = n > 0 ? days[n - 1] : days[days.length + n]
  if (!result || n === 0) throw new Error(year + '년 ' + month + '월에는 ' + Math.abs(n) + '번째 영업일이 없습니다')
  return Utilities.parseDate(result, KR_TZ, 'yyyy-MM-dd')
}

/**
 * 한 해의 공휴일 표 (날짜, 이름, 종류). 셀 하나에 넣으면 아래로 펼쳐집니다.
 *
 * @param {number} year 연도 (예: 2026)
 * @return {Array} 공휴일 표
 * @customfunction
 */
function KR_HOLIDAYS(year) {
  var rows = [['날짜', '이름', '종류']]
  var labels = { national: '법정 공휴일', substitute: '대체공휴일', temporary: '임시공휴일', election: '선거일' }
  krHolidaysOf_(Number(year)).forEach(function (h) {
    rows.push([Utilities.parseDate(h.date, KR_TZ, 'yyyy-MM-dd'), h.name, labels[h.type] || h.type])
  })
  return rows
}

// ---------- 내부 함수 (이름 끝의 _ 는 시트에서 숨김) ----------

function krMap_(value, fn) {
  if (Array.isArray(value)) {
    return value.map(function (row) {
      return row.map(function (cell) {
        return cell === '' ? '' : fn(krDateString_(cell))
      })
    })
  }
  return fn(krDateString_(value))
}

function krDateString_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, KR_TZ, 'yyyy-MM-dd')
  var s = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('날짜 형식이 아닙니다: ' + s + ' (예: 2026-10-09)')
  return s
}

function krAddDays_(dateString, days) {
  var d = new Date(dateString + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function krIsBusinessDay_(dateString, weekend) {
  var dow = new Date(dateString + 'T00:00:00Z').getUTCDay()
  var mode = weekend || 'sat-sun'
  if (mode !== 'none' && (dow === 0 || (dow === 6 && mode === 'sat-sun'))) return false
  return krHolidayNames_(dateString).length === 0
}

function krHolidayNames_(dateString) {
  return krHolidaysOf_(Number(dateString.slice(0, 4)))
    .filter(function (h) {
      return h.date === dateString
    })
    .map(function (h) {
      return h.name
    })
}

function krHolidaysOf_(year) {
  var cache = CacheService.getScriptCache()
  var key = 'kr-holidays-' + year
  var cached = cache.get(key)
  if (cached) return JSON.parse(cached)
  var res = UrlFetchApp.fetch(KR_HOLIDAYS_API + '/holidays?year=' + year, { muteHttpExceptions: true })
  var body = JSON.parse(res.getContentText())
  if (res.getResponseCode() !== 200) throw new Error(body.error ? body.error.message : '공휴일 정보를 가져오지 못했습니다')
  cache.put(key, JSON.stringify(body.holidays), 6 * 60 * 60)
  return body.holidays
}
