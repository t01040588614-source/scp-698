"""종목 코드 → 공식 표시명 (KRX · 유니버스 · US_NAMES)."""

from __future__ import annotations

from app.data.asia_universe import ASIA_UNIVERSE
from app.data.europe_universe import EUROPE_UNIVERSE
from app.data.korea_universe import KOREA_UNIVERSE
from app.data.seed_stocks import US_NAMES

_REGISTRY: dict[str, str] = {}

for _meta in KOREA_UNIVERSE:
    _REGISTRY[_meta["symbol"]] = _meta["name"]
for _meta in ASIA_UNIVERSE + EUROPE_UNIVERSE:
    _REGISTRY[_meta["symbol"]] = _meta["name"]
    _REGISTRY[_meta["symbol"].upper()] = _meta["name"]
for _sym, _name in US_NAMES.items():
    _REGISTRY[_sym.upper()] = _name


def registry_name(symbol: str) -> str | None:
    sym = (symbol or "").strip()
    if not sym:
        return None
    if sym in _REGISTRY:
        return _REGISTRY[sym]
    up = sym.upper()
    if up in _REGISTRY:
        return _REGISTRY[up]
    if sym.isdigit():
        z = sym.zfill(6)
        if z in _REGISTRY:
            return _REGISTRY[z]
    return None


def krx_listing_name(symbol: str) -> str | None:
    code = (symbol or "").strip()
    if not code or not code.isdigit():
        return None
    from app.services.krx_listing_cache import get_krx_company_name

    return get_krx_company_name(code)


def resolve_display_name(
    symbol: str,
    *,
    stock_type: str | None = None,
    current: str | None = None,
) -> str:
    sym = (symbol or "").strip()
    cur = (current or "").strip()
    canonical = registry_name(sym)
    if stock_type == "korea" and not canonical:
        canonical = krx_listing_name(sym)
    if canonical:
        if not cur or cur == sym or cur.upper() == sym.upper():
            return canonical
        if stock_type == "us" and _looks_like_ticker_only(cur, sym):
            return canonical
    if cur and cur != sym:
        return cur
    return canonical or cur or sym


def _looks_like_ticker_only(name: str, symbol: str) -> bool:
    n = name.strip()
    s = symbol.strip().upper()
    if not n:
        return True
    if n.upper() == s:
        return True
    if len(n) <= 5 and n.isupper() and n.isalpha():
        return True
    return False


def apply_display_name(row: dict) -> None:
    sym = str(row.get("symbol") or "").strip()
    if not sym:
        return
    row["name"] = resolve_display_name(
        sym,
        stock_type=row.get("type"),
        current=row.get("name"),
    )
