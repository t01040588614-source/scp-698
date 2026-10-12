import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_get_korea_stocks(client: AsyncClient):
    response = await client.get("/api/v1/stocks/korea")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.anyio
async def test_get_us_stocks(client: AsyncClient):
    response = await client.get("/api/v1/stocks/us")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.anyio
async def test_get_korea_stock_detail(client: AsyncClient):
    response = await client.get("/api/v1/stocks/korea/005930")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "005930"


@pytest.mark.anyio
async def test_get_us_stock_detail(client: AsyncClient):
    response = await client.get("/api/v1/stocks/us/AAPL")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "AAPL"


@pytest.mark.anyio
async def test_index_history_returns_enough_bars(client: AsyncClient):
    response = await client.get(
        "/api/v1/stocks/history",
        params={"symbol": "kospi200", "market": "index", "period": "6m"},
    )
    assert response.status_code == 200
    data = response.json()
    points = data.get("points") or []
    assert len(points) >= 2
    assert data.get("source") in ("yahoo", "fdr", "synthetic")
    for key in ("open", "high", "low", "close"):
        assert key in points[0]


@pytest.mark.anyio
async def test_market_cache_status(client: AsyncClient):
    response = await client.get("/api/v1/market/cache-status")
    assert response.status_code == 200
    data = response.json()
    assert data["korea_count"] >= 1
    assert "last_updated" in data
