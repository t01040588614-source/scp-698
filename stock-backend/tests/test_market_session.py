from datetime import datetime
from zoneinfo import ZoneInfo

from app.services.market_session import (
    full_session_response,
    get_korea_market_session,
    get_us_market_session,
    is_korea_regular_session,
)

KST = ZoneInfo("Asia/Seoul")
ET = ZoneInfo("America/New_York")


def test_krx_holiday_closed_during_regular_hours():
    # 2025 설날 연휴 (KRX CSV)
    now = datetime(2025, 1, 28, 11, 0, tzinfo=KST)
    assert get_korea_market_session(now) == "closed"
    assert not is_korea_regular_session(now)


def test_krx_regular_open():
    now = datetime(2025, 3, 4, 10, 0, tzinfo=KST)
    assert get_korea_market_session(now) == "open"
    assert is_korea_regular_session(now)


def test_nyse_holiday_july_fourth():
    now = datetime(2025, 7, 4, 12, 0, tzinfo=ET)
    assert get_us_market_session(now) == "closed"


def test_full_session_response_shape():
    body = full_session_response(datetime(2025, 3, 4, 10, 0, tzinfo=KST))
    assert "kr" in body and "us" in body
    assert body["kr"]["session"] == "open"
    assert "tooltip" in body["kr"]
