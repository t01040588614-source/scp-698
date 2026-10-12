from datetime import date

from app.services.economic_calendar_service import _merge_events, _parse_ff_rows


def test_parse_forex_factory_sample():
    rows = [
        {
            "title": "Non-Farm Payrolls",
            "country": "USD",
            "date": "2026-10-06T08:30:00-04:00",
            "impact": "High",
            "forecast": "180K",
            "previous": "175K",
        },
        {
            "title": "Bank Holiday",
            "country": "CNY",
            "date": "2026-10-04T19:01:00-04:00",
            "impact": "Holiday",
            "forecast": "",
            "previous": "",
        },
    ]
    start = date(2026, 10, 1)
    end = date(2026, 10, 15)
    parsed = _parse_ff_rows(rows, start, end)
    assert len(parsed) == 2
    us = next(e for e in parsed if e["event"] == "Non-Farm Payrolls")
    assert us["country"] == "US"
    assert us["impact"] == "high"


def test_merge_dedupes():
    a = [
        {
            "date": "2026-10-06",
            "time": "21:30",
            "country": "US",
            "event": "CPI",
            "impact": "high",
            "forecast": "—",
            "previous": "—",
            "actual": None,
            "sort_ts": 1.0,
            "source": "a",
        }
    ]
    b = [
        {
            "date": "2026-10-06",
            "time": "21:30",
            "country": "US",
            "event": "CPI",
            "impact": "high",
            "forecast": "0.3%",
            "previous": "0.2%",
            "actual": None,
            "sort_ts": 1.0,
            "source": "b",
        }
    ]
    merged = _merge_events(a, b)
    assert len(merged) == 1
