// 툴바 배지에 다음 공휴일 D-day 를 표시한다. 1시간마다, 그리고 브라우저를 켤 때 갱신한다.
const API = 'https://korea-holidays-api.greenteapie2023.workers.dev'

async function refreshBadge() {
  try {
    const res = await fetch(`${API}/holidays/next?count=1`)
    if (!res.ok) throw new Error(String(res.status))
    const [next] = (await res.json()).holidays
    if (!next) return chrome.action.setBadgeText({ text: '' })
    await chrome.storage.local.set({ next })
    const text = next.daysUntil === 0 ? '오늘' : next.daysUntil < 100 ? `D-${next.daysUntil}` : String(next.daysUntil)
    await chrome.action.setBadgeText({ text })
    await chrome.action.setBadgeBackgroundColor({ color: next.daysUntil === 0 ? '#2f7d4a' : '#cd2e3a' })
    await chrome.action.setTitle({ title: `다음 공휴일: ${next.name} (${next.date})` })
  } catch {
    // 오프라인이면 지난번 값을 그대로 둔다
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refresh', { periodInMinutes: 60 })
  refreshBadge()
})
chrome.runtime.onStartup.addListener(refreshBadge)
chrome.alarms.onAlarm.addListener((alarm) => alarm.name === 'refresh' && refreshBadge())
