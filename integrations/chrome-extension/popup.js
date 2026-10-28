const API = 'https://korea-holidays-api.greenteapie2023.workers.dev'
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const $ = (id) => document.getElementById(id)
const md = (date) => {
  const d = new Date(date + 'T00:00:00Z')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAYS[d.getUTCDay()]})`
}
const todayKst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)
let viewYear = Number(todayKst.slice(0, 4))
let viewMonth = Number(todayKst.slice(5, 7))

// 오프라인이어도 마지막으로 받은 값을 보여주도록 응답을 저장해 둔다
async function getJson(path) {
  const key = `cache:${path}`
  try {
    const res = await fetch(API + path)
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    chrome.storage.local.set({ [key]: data })
    return data
  } catch {
    return (await chrome.storage.local.get(key))[key] ?? null
  }
}

function li(left, right) {
  const el = document.createElement('li')
  const a = document.createElement('span')
  const b = document.createElement('span')
  a.textContent = left
  b.textContent = right
  el.append(a, b)
  return el
}

async function renderToday() {
  const info = await getJson(`/holidays/check?date=${todayKst}`)
  if (!info) return ($('today').textContent = '정보를 불러오지 못했어요')
  $('today').textContent = `${md(info.date)} ${info.isHoliday ? '🎉 ' + info.holidays.map((h) => h.name).join(', ') : info.isWeekend ? '😴 주말' : '💼 영업일'}`
  const data = await getJson(`/holidays/next?date=${todayKst}&count=6`)
  const upcoming = (data?.holidays ?? []).filter((h) => h.daysUntil > 0 || !info.isHoliday)
  const next = upcoming[0]
  $('next').innerHTML = ''
  if (next) {
    $('next').append('다음 공휴일 ')
    const b = document.createElement('b')
    b.textContent = next.daysUntil === 0 ? '오늘' : `D-${next.daysUntil}`
    $('next').append(b, ` · ${next.name}`)
  }
  $('upcoming').replaceChildren(...upcoming.slice(0, 5).map((h) => li(`${md(h.date)} ${h.name}`, h.daysUntil === 0 ? '오늘' : `D-${h.daysUntil}`)))
}

async function renderMonth() {
  $('month-title').textContent = `${viewYear}년 ${viewMonth}월`
  const data = await getJson(`/holidays?year=${viewYear}&month=${viewMonth}`)
  const holidays = data?.holidays ?? []
  const byDate = new Map(holidays.map((h) => [h.date, h]))
  const first = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay()
  const days = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate()
  const cells = WEEKDAYS.map((w) => Object.assign(document.createElement('div'), { className: 'h', textContent: w }))
  for (let i = 0; i < first; i++) cells.push(document.createElement('div'))
  for (let d = 1; d <= days; d++) {
    const date = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dow = (first + d - 1) % 7
    const cell = document.createElement('div')
    cell.textContent = d
    cell.className = [byDate.has(date) ? 'holiday' : dow === 0 ? 'sun' : dow === 6 ? 'sat' : '', date === todayKst ? 'today' : ''].join(' ')
    if (byDate.has(date)) cell.title = byDate.get(date).name
    cells.push(cell)
  }
  $('grid').replaceChildren(...cells)
  $('month-list').replaceChildren(...holidays.map((h) => li(`${md(h.date)} ${h.name}`, '')))
  if (!data) $('month-list').replaceChildren(li('이 달 정보를 불러오지 못했어요', ''))
}

function move(delta) {
  viewMonth += delta
  if (viewMonth < 1) (viewMonth = 12), viewYear--
  if (viewMonth > 12) (viewMonth = 1), viewYear++
  renderMonth()
}
$('prev').addEventListener('click', () => move(-1))
$('next-month').addEventListener('click', () => move(1))

renderToday()
renderMonth()
