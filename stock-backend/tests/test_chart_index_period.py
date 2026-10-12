import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_kosdaq_index_1w_ordinal_day_labels(client: AsyncClient):
    response = await client.get(
        "/api/v1/stocks/history",
        params={"symbol": "kosdaq", "market": "index", "period": "1w"},
    )
    assert response.status_code == 200
    points = response.json().get("points") or []
    assert len(points) == 7
    assert [p["time"] for p in points] == [
        "1일",
        "2일",
        "3일",
        "4일",
        "5일",
        "6일",
        "7일",
    ]


@pytest.mark.anyio
async def test_kosdaq_index_1m_ordinal_day_labels(client: AsyncClient):
    response = await client.get(
        "/api/v1/stocks/history",
        params={"symbol": "kosdaq", "market": "index", "period": "1m"},
    )
    assert response.status_code == 200
    points = response.json().get("points") or []
    assert len(points) >= 10
    assert points[0]["time"] == "1일"
    assert points[-1]["time"] == f"{len(points)}일"


@pytest.mark.anyio
async def test_kosdaq_index_1w_summary_matches_series(client: AsyncClient):
    response = await client.get(
        "/api/v1/stocks/history",
        params={"symbol": "kosdaq", "market": "index", "period": "1w"},
    )
    assert response.status_code == 200
    data = response.json()
    points = data.get("points") or []
    summary = data.get("summary") or {}
    assert len(points) >= 2
    assert data.get("source") in ("yahoo", "fdr", "synthetic")
    assert summary["open"] == points[0]["open"]
    assert summary["close"] == points[-1]["close"]
    assert summary["high"] >= max(p["high"] for p in points) - 0.02
    assert summary["low"] <= min(p["low"] for p in points) + 0.02


@pytest.mark.anyio
async def test_kosdaq_index_1m_has_enough_daily_bars(client: AsyncClient):
    response = await client.get(
        "/api/v1/stocks/history",
        params={"symbol": "kosdaq", "market": "index", "period": "1m"},
    )
    assert response.status_code == 200
    data = response.json()
    points = data.get("points") or []
    assert len(points) >= 10
    assert data.get("interval") in ("1d", "1wk", "1h", "60m", "5m", "15m", "30m")
