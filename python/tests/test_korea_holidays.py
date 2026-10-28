from datetime import date, datetime, timedelta, timezone

import pytest

import korea_holidays as kh


def test_supported_years():
    assert kh.SUPPORTED_YEARS == tuple(range(2015, 2028))
    assert kh.PROVISIONAL_YEARS == (2027,)


def test_holidays_and_observances():
    names = [h.name for h in kh.get_holidays(2026)]
    assert "노동절" in names and "제헌절" in names
    assert not any(h.type == "observance" for h in kh.get_holidays(2026))
    with_obs = kh.get_holidays(2026, observances=True)
    assert [h.date for h in with_obs] == sorted(h.date for h in with_obs)
    assert any(h.name == "어버이날" and h.type == "observance" for h in with_obs)


def test_holidays_on_multiple():
    assert [h.name for h in kh.holidays_on("2025-05-05")] == ["어린이날", "부처님오신날"]


def test_date_inputs():
    assert kh.is_holiday(date(2026, 10, 9))
    assert kh.is_holiday(datetime(2026, 10, 9, 23, 59))
    # 2026-10-08T15:30Z = 한국 시간 10/9 00:30
    assert kh.is_holiday(datetime(2026, 10, 8, 15, 30, tzinfo=timezone.utc))
    with pytest.raises(ValueError):
        kh.is_holiday("2026-02-30")
    with pytest.raises(kh.OutOfRangeError):
        kh.is_holiday("2031-01-01")


def test_business_days():
    assert kh.add_business_days("2026-09-23", 3) == date(2026, 9, 30)
    assert kh.add_business_days("2026-10-06", -1) == date(2026, 10, 2)
    assert kh.add_business_days("2026-10-09", 0) == date(2026, 10, 9)
    assert kh.add_business_days("2026-10-07", 1, include=["2026-10-08"]) == date(2026, 10, 12)
    with pytest.raises(kh.OutOfRangeError):
        kh.add_business_days("2027-12-30", 5)


def test_options():
    assert kh.is_business_day("2026-10-10", weekend="sun")
    assert not kh.is_business_day("2026-10-11", weekend="sun")
    assert kh.is_business_day("2026-05-01", exclude=["2026-05-01"])
    assert kh.is_business_day("2026-10-10", exclude=["2026-10-10"])
    with pytest.raises(ValueError):
        kh.is_business_day("2026-10-10", weekend="sat")


def test_count_business_days():
    assert kh.count_business_days("2026-10-01", "2026-10-31") == kh.DayCount(31, 20, 8, 3)
    assert kh.count_business_days("2026-10-01", "2026-10-31", weekend="none").business_days == 28


def test_next_holidays():
    result = kh.next_holidays("2026-12-25", 2)
    assert [(h.date, h.days_until) for h in result] == [(date(2026, 12, 25), 0), (date(2027, 1, 1), 7)]
    assert [h.date for h in kh.next_holidays("2027-12-26", 5)] == [date(2027, 12, 27)]
    assert len(kh.next_holidays(count=1)) <= 1


def test_long_weekends():
    starts = [w.start.isoformat() for w in kh.long_weekends(2026)]
    assert starts == [
        "2026-02-14", "2026-02-28", "2026-05-01", "2026-05-23", "2026-07-17",
        "2026-08-15", "2026-09-24", "2026-10-03", "2026-10-09", "2026-12-25",
    ]
    assert kh.long_weekends(2026)[0].holidays == ["설날 전날", "설날", "설날 다음날"]
    assert kh.long_weekends(2026, weekend="sun")[0].start == date(2026, 2, 15)


def test_vacation_tips():
    best = kh.vacation_tips(2027, 2)[0]
    assert (best.start, best.end, best.days) == (date(2027, 9, 11), date(2027, 9, 19), 9)
    assert best.leave_dates == [date(2027, 9, 13), date(2027, 9, 17)]
    assert best.efficiency == 4.5
    tips = kh.vacation_tips(2026, 3, limit=10)
    assert all(a.days >= b.days for a, b in zip(tips, tips[1:]))
    assert all(len(t.leave_dates) <= 3 for t in tips)
    ordered = sorted(tips, key=lambda t: t.start)
    assert all(b.start > a.end for a, b in zip(ordered, ordered[1:]))
