/*!
 * Korea Holidays 출고일 위젯 — https://github.com/GreenteaPIE/korea-holidays-api
 *
 * <div data-kr-shipping data-cutoff="14:00" data-delivery-days="1"></div>
 * <script src="https://korea-holidays-api.greenteapie2023.workers.dev/widget.js" async></script>
 *
 * data-cutoff           당일 출고 마감 (한국 시간, 기본 14:00)
 * data-processing-days  출고까지 영업일 (기본 0 = 당일 출고)
 * data-delivery-days    출고 후 도착까지 영업일 (넣으면 도착 예정일도 표시)
 * data-weekend          sat-sun(기본) · sun(토요일 출고) · none
 * data-include          쉬는 날 추가 (쉼표로 구분, YYYY-MM-DD)
 * data-template         문구. {ship} {arrival} {cutoff} {remaining} 를 바꿔 넣는다
 * data-plain            넣으면 기본 스타일 없이 글자만 출력
 */
;(function () {
  var script = document.currentScript
  var origin = script ? new URL(script.src).origin : 'https://korea-holidays-api.greenteapie2023.workers.dev'
  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

  function md(date) {
    var d = new Date(date + 'T00:00:00Z')
    return d.getUTCMonth() + 1 + '/' + d.getUTCDate() + '(' + WEEKDAYS[d.getUTCDay()] + ')'
  }

  function remaining(cutoff) {
    var now = new Date(Date.now() + 9 * 3600e3)
    var parts = cutoff.split(':')
    var minutes = Number(parts[0]) * 60 + Number(parts[1]) - (now.getUTCHours() * 60 + now.getUTCMinutes())
    if (minutes <= 0) return ''
    return (minutes >= 60 ? Math.floor(minutes / 60) + '시간 ' : '') + (minutes % 60) + '분'
  }

  function render(el, data) {
    var template =
      el.getAttribute('data-template') ||
      '🚚 지금 주문하면 <b>{ship}</b> 출고' +
        (data.arrivalDate ? ' · {arrival} 도착 예정' : '') +
        (data.beforeCutoff ? ' <small>(마감까지 {remaining})</small>' : '')
    var values = {
      ship: data.shipDate === new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) ? '오늘 ' + md(data.shipDate) : md(data.shipDate),
      arrival: data.arrivalDate ? md(data.arrivalDate) : '',
      cutoff: data.cutoff,
      remaining: remaining(data.cutoff),
    }
    // 문구는 가게 주인이 쓴 것이라 HTML 을 허용하고, 값은 날짜·시각뿐이라 그대로 넣는다
    el.innerHTML = template.replace(/\{(ship|arrival|cutoff|remaining)\}/g, function (_, key) {
      return values[key]
    })
    if (!el.hasAttribute('data-plain')) {
      el.style.cssText +=
        ';display:inline-block;padding:6px 12px;border-radius:999px;background:#eef4ff;color:#0b3d91;font-size:14px;line-height:1.4'
    }
  }

  function load(el) {
    var params = new URLSearchParams()
    var map = { cutoff: 'cutoff', 'processing-days': 'processingDays', 'delivery-days': 'deliveryDays', weekend: 'weekend', include: 'include' }
    Object.keys(map).forEach(function (attr) {
      var value = el.getAttribute('data-' + attr)
      if (value) params.set(map[attr], value)
    })
    fetch(origin + '/shipping-date?' + params)
      .then(function (res) {
        return res.ok ? res.json() : Promise.reject(res.status)
      })
      .then(function (data) {
        render(el, data)
        // 마감 시각이 지나면 출고일이 바뀌므로 1분마다 다시 계산
        if (data.beforeCutoff) setTimeout(function () { load(el) }, 60000)
      })
      .catch(function () {
        el.hidden = true
      })
  }

  function init() {
    var nodes = document.querySelectorAll('[data-kr-shipping]')
    for (var i = 0; i < nodes.length; i++) load(nodes[i])
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
