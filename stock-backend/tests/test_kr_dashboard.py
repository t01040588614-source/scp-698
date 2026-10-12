import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_kr_stocks_list(client: AsyncClient):
    response = await client.get("/api/v1/kr/stocks?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "stocks" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.anyio
async def test_kr_stock_detail(client: AsyncClient):
    response = await client.get("/api/v1/kr/stocks/005930")
    assert response.status_code == 200
    body = response.json()
    assert body["stock"]["code"] == "005930"


@pytest.mark.anyio
async def test_kr_consensus_seed(client: AsyncClient):
    response = await client.get("/api/v1/kr/stocks/005930/consensus")
    assert response.status_code == 200
    assert response.json() is not None


@pytest.mark.anyio
async def test_docx_stocks_list(client: AsyncClient):
    response = await client.get("/api/v1/stocks?limit=5&sortBy=marketCap")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.anyio
async def test_docx_stock_detail(client: AsyncClient):
    response = await client.get("/api/v1/stocks/005930")
    assert response.status_code == 200
    assert response.json()["stock"]["code"] == "005930"
