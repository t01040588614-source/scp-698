import logging
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.korea_universe import KOREA_UNIVERSE
from app.data.kr_seed_analytics import KR_CONSENSUS_SEED, KR_FUNDAMENTAL_SEED, KR_NEWS_SEED
from app.models.kr_analytics import KrConsensus, KrFundamentalSnapshot, KrStockNews, UserScreener
from app.models.kr_stock_catalog import KrStockDailyQuote
from app.schemas.kr_dashboard import KrListStocksQuery, ScreenerCreate
from app.services.chart_service import chart_service
from app.services.market_data import market_data

logger = logging.getLogger(__name__)

META_BY_CODE = {m["symbol"]: m for m in KOREA_UNIVERSE}


def _fundamentals_memory() -> dict[str, dict]:
    out = dict(KR_FUNDAMENTAL_SEED)
    for row in market_data.get_by_type("korea"):
        code = row.get("symbol")
        if not code:
            continue
        entry = out.setdefault(code, {})
        if row.get("pe_ratio"):
            entry.setdefault("per", float(row["pe_ratio"]))
        if row.get("market_cap"):
            entry.setdefault("market_cap_hint", float(row["market_cap"]))
    return out


def _row_to_item(stock: dict, fund: dict | None) -> dict[str, Any]:
    code = stock.get("symbol", "")
    meta = META_BY_CODE.get(code, {})
    f = fund or {}
    return {
        "code": code,
        "name": stock.get("name") or meta.get("name") or code,
        "name_en": None,
        "market": stock.get("market") or meta.get("market"),
        "sector": stock.get("sector") or meta.get("sector"),
        "industry": f.get("industry"),
        "market_cap": stock.get("market_cap") or f.get("market_cap_hint"),
        "price": stock.get("price"),
        "change": stock.get("change"),
        "change_percent": stock.get("change_percent"),
        "volume": stock.get("volume"),
        "per": f.get("per") or stock.get("pe_ratio"),
        "pbr": f.get("pbr"),
        "dividend_yield": f.get("dividend_yield"),
    }


class KrDashboardService:
    def __init__(self, db: AsyncSession | None = None):
        self.db = db

    async def _fund_map_db(self) -> dict[str, dict]:
        memory = _fundamentals_memory()
        if not self.db:
            return memory
        try:
            result = await self.db.execute(select(KrFundamentalSnapshot))
            for row in result.scalars().all():
                memory[row.code] = {
                    "fiscal_year": row.fiscal_year,
                    "fiscal_quarter": row.fiscal_quarter,
                    "per": row.per,
                    "pbr": row.pbr,
                    "roe": row.roe,
                    "op_margin": row.op_margin,
                    "net_margin": row.net_margin,
                    "debt_ratio": row.debt_ratio,
                    "dividend_yield": row.dividend_yield,
                    "industry": row.industry,
                }
        except Exception as exc:
            logger.warning("Fundamentals DB read failed: %s", exc)
        return memory

    async def list_stocks(self, dto: KrListStocksQuery) -> dict[str, Any]:
        market_data.ensure_fresh()
        funds = await self._fund_map_db()
        items = []
        for stock in market_data.get_by_type("korea"):
            code = stock.get("symbol")
            if not code:
                continue
            item = _row_to_item(stock, funds.get(code))
            if dto.query:
                q = dto.query.lower()
                name_en = (item["name_en"] or "").lower()
                if q not in item["name"].lower() and q not in code and q not in name_en:
                    continue
            if dto.market and item["market"] != dto.market:
                continue
            if dto.sector and (item["sector"] or "") != dto.sector:
                continue
            if dto.industry and (item["industry"] or "") != dto.industry:
                continue
            mc = item["market_cap"] or 0
            if dto.market_cap_gte is not None and mc < dto.market_cap_gte:
                continue
            if dto.market_cap_lte is not None and mc > dto.market_cap_lte:
                continue
            per = item["per"]
            if dto.per_gte is not None and (per is None or per < dto.per_gte):
                continue
            if dto.per_lte is not None and (per is None or per > dto.per_lte):
                continue
            pbr = item["pbr"]
            if dto.pbr_gte is not None and (pbr is None or pbr < dto.pbr_gte):
                continue
            if dto.pbr_lte is not None and (pbr is None or pbr > dto.pbr_lte):
                continue
            dy = item["dividend_yield"]
            if dto.dividend_yield_gte is not None and (dy is None or dy < dto.dividend_yield_gte):
                continue
            items.append(item)

        sort_key = dto.sort_by
        reverse = dto.sort_order == "DESC"

        def sort_val(it: dict) -> float | str:
            if sort_key == "name":
                return it["name"]
            if sort_key == "price":
                return float(it["price"] or 0)
            return float(it.get(sort_key if sort_key != "marketCap" else "market_cap") or 0)

        items.sort(key=sort_val, reverse=reverse)
        total = len(items)
        page = items[dto.offset : dto.offset + dto.limit]
        return {"stocks": page, "total": total}

    async def get_detail(self, code: str) -> dict[str, Any] | None:
        market_data.ensure_fresh(max_age_sec=8)
        market_data.schedule_symbol_fresh(code)
        stock = market_data.get_by_symbol(code)
        if not stock or stock.get("type") != "korea":
            return None
        funds = await self._fund_map_db()
        item = _row_to_item(stock, funds.get(code))
        f = funds.get(code)
        fundamental = None
        if f:
            fundamental = {
                "fiscal_year": f.get("fiscal_year"),
                "fiscal_quarter": f.get("fiscal_quarter"),
                "per": f.get("per"),
                "pbr": f.get("pbr"),
                "roe": f.get("roe"),
                "op_margin": f.get("op_margin"),
                "net_margin": f.get("net_margin"),
                "debt_ratio": f.get("debt_ratio"),
                "dividend_yield": f.get("dividend_yield"),
                "industry": f.get("industry"),
            }
        lu = market_data.last_updated()
        latest_quote = {
            "date": lu.date().isoformat() if lu else None,
            "open": stock.get("open"),
            "high": stock.get("high"),
            "low": stock.get("low"),
            "close": stock.get("price"),
            "volume": stock.get("volume"),
        }
        return {"stock": item, "latest_quote": latest_quote, "fundamental": fundamental}

    async def get_quotes(self, code: str, limit: int = 200) -> list[dict]:
        if self.db:
            try:
                result = await self.db.execute(
                    select(KrStockDailyQuote)
                    .where(KrStockDailyQuote.code == code)
                    .order_by(KrStockDailyQuote.quote_date.asc())
                    .limit(limit)
                )
                rows = result.scalars().all()
                if rows:
                    return [
                        {
                            "date": r.quote_date.isoformat(),
                            "open": r.open,
                            "high": r.high,
                            "low": r.low,
                            "close": r.close,
                            "volume": float(r.volume or 0),
                        }
                        for r in rows
                    ]
            except Exception as exc:
                logger.warning("Quotes DB read: %s", exc)
        hist = await chart_service.get_history(code, "korea", "1y")
        raw_points = hist.get("points") or []
        points = raw_points[-limit:] if raw_points else []
        return [
            {
                "date": p.time[:10] if p.time else "",
                "open": p.open,
                "high": p.high,
                "low": p.low,
                "close": p.close,
                "volume": float(p.volume),
            }
            for p in points
        ]

    async def get_news(self, code: str, limit: int = 20) -> list[dict]:
        if self.db:
            try:
                result = await self.db.execute(
                    select(KrStockNews)
                    .where((KrStockNews.code == code) | (KrStockNews.code.is_(None)))
                    .order_by(KrStockNews.published_at.desc())
                    .limit(limit)
                )
                rows = result.scalars().all()
                if rows:
                    return [
                        {
                            "id": n.id,
                            "title": n.title,
                            "summary": n.summary,
                            "url": n.url,
                            "source": n.source,
                            "published_at": n.published_at,
                            "sentiment": n.sentiment,
                        }
                        for n in rows
                    ]
            except Exception as exc:
                logger.warning("News DB read: %s", exc)
        out = []
        for i, n in enumerate(KR_NEWS_SEED):
            if n["code"] not in (code, None):
                continue
            out.append({"id": i + 1, **n})
            if len(out) >= limit:
                break
        return out

    async def get_consensus(self, code: str) -> dict | None:
        if self.db:
            try:
                result = await self.db.execute(
                    select(KrConsensus)
                    .where(KrConsensus.code == code)
                    .order_by(KrConsensus.as_of.desc())
                    .limit(1)
                )
                row = result.scalar_one_or_none()
                if row:
                    return {
                        "date": row.as_of,
                        "target_price_avg": row.target_price_avg,
                        "target_price_high": row.target_price_high,
                        "target_price_low": row.target_price_low,
                        "buy_count": row.buy_count,
                        "hold_count": row.hold_count,
                        "sell_count": row.sell_count,
                    }
            except Exception as exc:
                logger.warning("Consensus DB read: %s", exc)
        seed = KR_CONSENSUS_SEED.get(code)
        if not seed:
            return None
        return {
            "date": seed["as_of"],
            "target_price_avg": seed["target_price_avg"],
            "target_price_high": seed["target_price_high"],
            "target_price_low": seed["target_price_low"],
            "buy_count": seed["buy_count"],
            "hold_count": seed["hold_count"],
            "sell_count": seed["sell_count"],
        }

    async def save_screener(self, body: ScreenerCreate, user_id: int | None) -> UserScreener:
        if not self.db:
            raise RuntimeError("DB unavailable")
        row = UserScreener(
            name=body.name,
            conditions=body.conditions,
            created_by=body.created_by,
            user_id=user_id,
        )
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return row

    async def list_screeners(
        self, created_by: str | None, user_id: int | None
    ) -> list[UserScreener]:
        if not self.db:
            return []
        q = select(UserScreener).order_by(UserScreener.created_at.desc())
        if user_id is not None:
            q = q.where(UserScreener.user_id == user_id)
        elif created_by:
            q = q.where(UserScreener.created_by == created_by)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def delete_screener(self, screener_id: int, user_id: int | None) -> bool:
        if not self.db:
            return False
        q = delete(UserScreener).where(UserScreener.id == screener_id)
        if user_id is not None:
            q = q.where(UserScreener.user_id == user_id)
        result = await self.db.execute(q)
        rowcount = getattr(result, "rowcount", 0) or 0
        return rowcount > 0


async def seed_kr_analytics(db: AsyncSession) -> None:
    """ETL 더미 — DOCX ingest-* 대응."""
    try:
        existing = await db.execute(select(KrFundamentalSnapshot).limit(1))
        if existing.scalar_one_or_none():
            return
        for code, f in KR_FUNDAMENTAL_SEED.items():
            db.add(
                KrFundamentalSnapshot(
                    code=code,
                    fiscal_year=f.get("fiscal_year"),
                    fiscal_quarter=f.get("fiscal_quarter"),
                    per=f.get("per"),
                    pbr=f.get("pbr"),
                    roe=f.get("roe"),
                    op_margin=f.get("op_margin"),
                    net_margin=f.get("net_margin"),
                    debt_ratio=f.get("debt_ratio"),
                    dividend_yield=f.get("dividend_yield"),
                    industry=f.get("industry"),
                )
            )
        for n in KR_NEWS_SEED:
            db.add(KrStockNews(**n))
        for code, c in KR_CONSENSUS_SEED.items():
            db.add(
                KrConsensus(
                    code=code,
                    as_of=c["as_of"],
                    target_price_avg=c["target_price_avg"],
                    target_price_high=c["target_price_high"],
                    target_price_low=c["target_price_low"],
                    buy_count=c["buy_count"],
                    hold_count=c["hold_count"],
                    sell_count=c["sell_count"],
                )
            )
        await db.commit()
        logger.info("KR analytics seed applied")
    except Exception as exc:
        await db.rollback()
        logger.warning("KR analytics seed skipped: %s", exc)
