# korea-holidays (Python)

대한민국 공휴일·영업일 계산 라이브러리 — 대체공휴일·임시공휴일·선거일, 연차 추천까지. 의존성 없음.

```bash
pip install korea-holidays
```

```python
from datetime import date
import korea_holidays as kh

kh.is_holiday("2026-07-17")                      # True (제헌절)
kh.add_business_days("2026-09-23", 3)            # date(2026, 9, 30) — 추석·주말 건너뜀
kh.add_business_days("2026-09-23", 3, weekend="sun")  # 토요일 영업
kh.count_business_days("2026-10-01", "2026-10-31").business_days  # 20
kh.next_holidays(count=3)                        # 오늘부터 다가오는 공휴일 (days_until 포함)

kh.adjust_to_business_day("2026-10-25")         # date(2026, 10, 23) — 급여일이 일요일이면 금요일
kh.nth_business_day(2026, 12, -1)                # date(2026, 12, 31) — 마지막 영업일
kh.annual_leave("2024-03-02").current_days       # 15 — 입사일 기준 지금 연차

tip = kh.vacation_tips(2027, leave_days=2)[0]
tip.start, tip.end, tip.days, tip.leave_dates    # 2027-09-11 ~ 09-19, 9일, [9/13, 9/17]
```

- 날짜는 `date`, `datetime`, `"YYYY-MM-DD"` 를 받습니다. 시간대가 있는 `datetime` 은 **한국 시간 기준 날짜**로 해석합니다.
- 영업일 옵션: `weekend="sat-sun" | "sun" | "none"`, `include=[회사 휴일]`, `exclude=[출근하는 휴일]`
- 지원 연도는 2015~2027 (`kh.SUPPORTED_YEARS`) 이고, 밖이면 `kh.OutOfRangeError` 를 던집니다.

## 함수

| 함수 | 설명 |
|---|---|
| `get_holidays(year, observances=False)` | 연도별 공휴일 (`observances=True` 면 기념일 포함) |
| `holidays_on(d)` / `is_holiday(d)` | 날짜의 공휴일 |
| `is_business_day(d, ...)` | 영업일 여부 |
| `add_business_days(d, days, ...)` | 영업일 기준 N일 뒤(음수면 앞) |
| `count_business_days(start, end, ...)` | 기간 영업일 수 |
| `next_holidays(start=None, count=1)` | 다가오는 공휴일과 D-day |
| `long_weekends(year, min_days=3, ...)` | 3일 이상 연휴 |
| `vacation_tips(year, leave_days, limit=5, ...)` | 연차로 만드는 최장 휴가 |
| `adjust_to_business_day(d, rule="previous", ...)` | 휴일이면 앞/뒤 영업일로 (급여일·결제일) |
| `nth_business_day(year, month, n, ...)` | 그 달의 N번째 영업일 (-1 은 마지막) |
| `business_days_in_month(year, month, ...)` | 그 달의 영업일 목록 |
| `annual_leave(hire_date, as_of=None)` | 입사일 기준 연차 개수 (근로기준법 제60조) |
| `shipping_date(now=None, cutoff="14:00", ...)` | 지금 주문하면 언제 출고·도착? |

공휴일 데이터는 [korea-holidays-api](https://github.com/GreenteaPIE/korea-holidays-api) 저장소에서 관리하며, 매주 공공데이터포털 특일정보와 자동으로 대조합니다.
HTTP API 와 npm 패키지(`korea-holidays`)도 있습니다.

> 관공서 기준 공휴일입니다. 민간 기업의 휴무 여부는 회사 규정에 따라 다를 수 있습니다.
