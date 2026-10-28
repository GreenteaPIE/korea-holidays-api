"""대한민국 공휴일·영업일 계산 라이브러리.

대체공휴일·임시공휴일·선거일을 포함한 관공서 공휴일 기준으로 계산한다.
날짜는 ``datetime.date``, ``datetime.datetime``, ``'YYYY-MM-DD'`` 문자열을 받는다.
시간대가 있는 ``datetime`` 은 한국 시간(KST) 기준 날짜로 바꾸고, 결과 날짜는 ``datetime.date`` 로 돌려준다.

데이터는 https://github.com/GreenteaPIE/korea-holidays-api 의 TypeScript 데이터에서 생성된다.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from importlib import resources
from typing import Dict, Iterable, List, Literal, Optional, Sequence, Set, Tuple, Union

__version__ = "0.2.0"

__all__ = [
    "Holiday",
    "UpcomingHoliday",
    "DayCount",
    "LongWeekend",
    "VacationTip",
    "OutOfRangeError",
    "SUPPORTED_YEARS",
    "PROVISIONAL_YEARS",
    "get_holidays",
    "holidays_on",
    "is_holiday",
    "is_business_day",
    "add_business_days",
    "count_business_days",
    "next_holidays",
    "long_weekends",
    "vacation_tips",
]

HolidayType = Literal["national", "substitute", "temporary", "election", "observance"]
WeekendMode = Literal["sat-sun", "sun", "none"]
DateInput = Union[date, datetime, str]
DayKind = Literal["business", "weekend", "holiday"]

KST = timezone(timedelta(hours=9))


@dataclass(frozen=True)
class Holiday:
    date: date
    name: str
    name_en: str
    type: HolidayType


@dataclass(frozen=True)
class UpcomingHoliday(Holiday):
    days_until: int = 0


@dataclass(frozen=True)
class DayCount:
    total_days: int
    business_days: int
    #: 주말 수 (주말과 겹친 공휴일은 holiday_days 로 센다)
    weekend_days: int
    #: 공휴일·추가 휴일 수
    holiday_days: int


@dataclass(frozen=True)
class LongWeekend:
    start: date
    end: date
    days: int
    #: 기간에 걸린 공휴일 이름 (중복 제거)
    holidays: List[str]


@dataclass(frozen=True)
class VacationTip(LongWeekend):
    #: 연차를 써야 하는 날
    leave_dates: List[date] = field(default_factory=list)
    #: 연차 하루당 쉬는 날 수
    efficiency: float = 0.0


class OutOfRangeError(ValueError):
    """데이터가 없는 연도의 날짜를 계산하려 할 때 발생한다."""

    def __init__(self, year: int) -> None:
        super().__init__(
            f"{year}년 데이터는 아직 지원하지 않습니다. 지원 연도: {', '.join(map(str, SUPPORTED_YEARS))}"
        )
        self.year = year


def _load() -> Tuple[Dict[int, List[Holiday]], Dict[int, List[Holiday]], List[int]]:
    raw = json.loads(resources.files(__name__).joinpath("holidays.json").read_text(encoding="utf-8"))

    def convert(items: Iterable[dict]) -> List[Holiday]:
        return [Holiday(date.fromisoformat(h["date"]), h["name"], h["nameEn"], h["type"]) for h in items]

    holidays = {int(y): convert(items) for y, items in raw["holidays"].items()}
    observances = {int(y): convert(items) for y, items in raw["observances"].items()}
    return holidays, observances, list(raw["provisional"])


_HOLIDAYS, _OBSERVANCES, _PROVISIONAL = _load()
_BY_DATE: Dict[date, List[Holiday]] = {}
for _list in _HOLIDAYS.values():
    for _h in _list:
        _BY_DATE.setdefault(_h.date, []).append(_h)

SUPPORTED_YEARS: Tuple[int, ...] = tuple(sorted(_HOLIDAYS))
#: 정부 공식 발표(임시공휴일 지정 등) 전이라 바뀔 수 있는 연도
PROVISIONAL_YEARS: Tuple[int, ...] = tuple(_PROVISIONAL)

_MAX_SPAN_DAYS = 45


def _to_date(value: DateInput) -> date:
    if isinstance(value, datetime):
        if value.tzinfo is not None:
            return value.astimezone(KST).date()
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            raise ValueError(f"올바른 날짜가 아닙니다: {value!r} (YYYY-MM-DD 형식)") from None
    raise TypeError(f"date, datetime 또는 'YYYY-MM-DD' 문자열이어야 합니다: {value!r}")


def _today_kst() -> date:
    return datetime.now(KST).date()


def _is_supported(d: date) -> bool:
    return d.year in _HOLIDAYS


def _assert_supported(d: date) -> None:
    if not _is_supported(d):
        raise OutOfRangeError(d.year)


class _Options:
    __slots__ = ("weekend", "include", "exclude")

    def __init__(self, weekend: WeekendMode, include: Iterable[DateInput], exclude: Iterable[DateInput]) -> None:
        if weekend not in ("sat-sun", "sun", "none"):
            raise ValueError(f"weekend 는 'sat-sun', 'sun', 'none' 중 하나여야 합니다: {weekend!r}")
        self.weekend = weekend
        self.include: Set[date] = {_to_date(d) for d in include}
        self.exclude: Set[date] = {_to_date(d) for d in exclude}

    def is_weekend(self, d: date) -> bool:
        dow = d.weekday()  # 월=0 ... 일=6
        if self.weekend == "none":
            return False
        if self.weekend == "sun":
            return dow == 6
        return dow >= 5

    def kind(self, d: date) -> DayKind:
        """exclude 가 가장 우선이고, 그다음 공휴일·include, 마지막이 주말이다."""
        _assert_supported(d)
        if d in self.exclude:
            return "business"
        if d in _BY_DATE or d in self.include:
            return "holiday"
        if self.is_weekend(d):
            return "weekend"
        return "business"

    def is_off(self, d: date) -> bool:
        return _is_supported(d) and self.kind(d) != "business"


def get_holidays(year: int, observances: bool = False) -> List[Holiday]:
    """연도별 공휴일 목록. ``observances=True`` 면 어버이날 같은 기념일(휴일 아님)도 포함한다."""
    if year not in _HOLIDAYS:
        raise OutOfRangeError(year)
    if not observances:
        return list(_HOLIDAYS[year])
    # sorted 는 안정 정렬이라 같은 날짜면 공휴일이 기념일보다 앞에 온다
    return sorted(_HOLIDAYS[year] + _OBSERVANCES[year], key=lambda h: h.date)


def holidays_on(value: DateInput) -> List[Holiday]:
    """해당 날짜의 공휴일 목록. 2025-05-05 처럼 한 날짜에 둘 이상일 수 있다."""
    d = _to_date(value)
    _assert_supported(d)
    return list(_BY_DATE.get(d, []))


def is_holiday(value: DateInput) -> bool:
    return len(holidays_on(value)) > 0


def is_business_day(
    value: DateInput,
    weekend: WeekendMode = "sat-sun",
    include: Iterable[DateInput] = (),
    exclude: Iterable[DateInput] = (),
) -> bool:
    """영업일 여부. weekend: 'sat-sun'(기본) · 'sun'(토요일 영업) · 'none'(주말 구분 없음)."""
    return _Options(weekend, include, exclude).kind(_to_date(value)) == "business"


def add_business_days(
    value: DateInput,
    days: int,
    weekend: WeekendMode = "sat-sun",
    include: Iterable[DateInput] = (),
    exclude: Iterable[DateInput] = (),
) -> date:
    """영업일 기준 days 일 뒤(음수면 앞)의 날짜. 시작일은 세지 않으며 days 가 0 이면 시작일 그대로."""
    options = _Options(weekend, include, exclude)
    current = _to_date(value)
    _assert_supported(current)
    step = timedelta(days=-1 if days < 0 else 1)
    remaining = abs(days)
    while remaining > 0:
        current += step
        if options.kind(current) == "business":
            remaining -= 1
    return current


def count_business_days(
    start: DateInput,
    end: DateInput,
    weekend: WeekendMode = "sat-sun",
    include: Iterable[DateInput] = (),
    exclude: Iterable[DateInput] = (),
) -> DayCount:
    """start ~ end (양 끝 포함) 기간의 영업일 수."""
    options = _Options(weekend, include, exclude)
    s, e = _to_date(start), _to_date(end)
    _assert_supported(s)
    _assert_supported(e)
    counts = {"business": 0, "weekend": 0, "holiday": 0}
    d = s
    while d <= e:
        counts[options.kind(d)] += 1
        d += timedelta(days=1)
    total = (e - s).days + 1 if e >= s else 0
    return DayCount(total, counts["business"], counts["weekend"], counts["holiday"])


def next_holidays(start: Optional[DateInput] = None, count: int = 1) -> List[UpcomingHoliday]:
    """start(기본 오늘, 당일 포함) 이후의 공휴일을 가까운 순으로 최대 count 개."""
    s = _to_date(start) if start is not None else _today_kst()
    _assert_supported(s)
    upcoming = [h for y in SUPPORTED_YEARS for h in _HOLIDAYS[y] if h.date >= s][:count]
    return [UpcomingHoliday(h.date, h.name, h.name_en, h.type, (h.date - s).days) for h in upcoming]


def _holiday_names(start: date, end: date) -> List[str]:
    names: Dict[str, None] = {}
    d = start
    while d <= end:
        for h in _BY_DATE.get(d, []):
            names[h.name] = None
        d += timedelta(days=1)
    return list(names)


def _year_bounds(year: int) -> Tuple[date, date]:
    if year not in _HOLIDAYS:
        raise OutOfRangeError(year)
    return date(year, 1, 1), date(year, 12, 31)


def long_weekends(
    year: int,
    min_days: int = 3,
    weekend: WeekendMode = "sat-sun",
    include: Iterable[DateInput] = (),
    exclude: Iterable[DateInput] = (),
) -> List[LongWeekend]:
    """해당 연도에 시작하는, 쉬는 날이 min_days 일 이상 이어지는 연휴 (공휴일이 하루 이상 낀 것만)."""
    options = _Options(weekend, include, exclude)
    first, last = _year_bounds(year)
    one = timedelta(days=1)
    result: List[LongWeekend] = []
    d = first
    # 1월 1일이 작년부터 이어진 연휴의 일부면 작년 목록에 속하므로 건너뛴다
    while d <= last and options.is_off(d) and options.is_off(d - one):
        d += one
    while d <= last:
        if not options.is_off(d):
            d += one
            continue
        start = end = d
        while options.is_off(end + one):
            end += one
        days = (end - start).days + 1
        span = [start + timedelta(days=i) for i in range(days)]
        if days >= min_days and any(options.kind(x) == "holiday" for x in span):
            result.append(LongWeekend(start, end, days, _holiday_names(start, end)))
        d = end + one
    return result


def vacation_tips(
    year: int,
    leave_days: int,
    limit: int = 5,
    weekend: WeekendMode = "sat-sun",
    include: Iterable[DateInput] = (),
    exclude: Iterable[DateInput] = (),
) -> List[VacationTip]:
    """연차 leave_days 일 이하로 만들 수 있는 가장 긴 휴가 조합을 추천 순서(긴 순, 같으면 연차를 덜 쓰는 순)로."""
    options = _Options(weekend, include, exclude)
    first, last = _year_bounds(year)
    origin = first - timedelta(days=1)  # index 0 은 1월 1일 전날
    last_index = (last - origin).days
    kinds: List[Optional[str]] = []
    for i in range(last_index + _MAX_SPAN_DAYS + 2):
        d = origin + timedelta(days=i)
        kinds.append(options.kind(d) if _is_supported(d) else None)

    def off(i: int) -> bool:
        return i < len(kinds) and kinds[i] is not None and kinds[i] != "business"

    prefix = [0]
    for kind in kinds:
        prefix.append(prefix[-1] + (1 if kind == "holiday" else 0))

    candidates: List[Tuple[int, int, List[int]]] = []
    for start in range(1, last_index + 1):
        # 앞날도 쉬는 날이면 거기서 시작하는 게 더 길다
        if off(start - 1):
            continue
        leave: List[int] = []
        end = start
        while end < start + _MAX_SPAN_DAYS and kinds[end] is not None:
            if not off(end):
                leave.append(end)
                if len(leave) > leave_days:
                    break
            # 다음 날이 영업일(또는 데이터 밖)인 지점에서만 끊어야 쉬는 날을 버리지 않는다
            if leave and not off(end + 1) and prefix[end + 1] - prefix[start] > 0:
                candidates.append((start, end, list(leave)))
            end += 1

    candidates.sort(key=lambda c: (-(c[1] - c[0] + 1), len(c[2]), c[0]))
    picked: List[Tuple[int, int, List[int]]] = []
    for c in candidates:
        if len(picked) >= limit:
            break
        if any(c[0] <= p[1] and p[0] <= c[1] for p in picked):
            continue
        picked.append(c)

    def to_date(i: int) -> date:
        return origin + timedelta(days=i)

    return [
        VacationTip(
            start=to_date(s),
            end=to_date(e),
            days=e - s + 1,
            holidays=_holiday_names(to_date(s), to_date(e)),
            leave_dates=[to_date(i) for i in leave],
            # TypeScript 의 Math.round 와 같게 반올림 (파이썬 round 는 2.25 → 2.2)
            efficiency=math.floor((e - s + 1) / len(leave) * 10 + 0.5) / 10,
        )
        for s, e, leave in picked
    ]
