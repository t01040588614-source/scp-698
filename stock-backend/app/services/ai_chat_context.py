"""챗봇용 페이지·시세 컨텍스트."""

from __future__ import annotations

from app.services.market_data import market_data

PAGE_HINTS: dict[str, str] = {
    "/korea": "한국 주식 실시간·종목 보드 (KOSPI/KOSDAQ)",
    "/us": "미국 주식 실시간·종목 보드 (NYSE/NASDAQ)",
    "/markets": "글로벌·아시아·유럽 시장 허브",
    "/charts": "차트·기술적 분석 (OHLCV, 이동평균, 캔들)",
    "/portfolio": "보유 종목·손익 포트폴리오",
    "/watchlist": "관심종목·가격 알림",
    "/search": "종목 통합 검색",
    "/news": "금융 뉴스 피드",
    "/analysis": "시장·매크로 분석 리포트",
    "/calendar": "경제 캘린더",
    "/tools": "투자 도구·시스템 상태",
    "/tools/integrations": "API 키 연동 (KIS, AI, OAuth 등)",
}


def page_hint(page_path: str | None) -> str | None:
    if not page_path:
        return None
    base = page_path.split("?")[0].rstrip("/") or "/"
    if base in PAGE_HINTS:
        return PAGE_HINTS[base]
    if base.startswith("/quote/"):
        return "종목 상세·시세·차트 바로가기 페이지"
    if base.startswith("/stocks/"):
        return "한국 종목 상세 페이지"
    return None


def _normalize_market(market: str | None) -> str | None:
    if not market:
        return None
    m = market.strip().lower()
    if m in ("korea", "kr", "kospi", "kosdaq"):
        return "korea"
    if m in ("us", "usa", "nyse", "nasdaq"):
        return "us"
    return m


def lookup_quote(symbol: str, market: str | None) -> dict | None:
    sym = symbol.strip()
    if not sym:
        return None
    row = market_data.get_by_symbol(sym)
    if row:
        return row
    upper = sym.upper()
    row = market_data.get_by_symbol(upper)
    if row:
        return row
    m = _normalize_market(market)
    want_type = "korea" if m == "korea" else "us" if m == "us" else None
    for item in market_data.get_all():
        item_sym = str(item.get("symbol") or "")
        if item_sym != sym and item_sym.upper() != upper:
            continue
        if want_type and item.get("type") != want_type:
            continue
        return item
    return None


def format_quote_snippet(row: dict) -> str:
    name = row.get("name") or row.get("name_ko") or row.get("name_en") or ""
    sym = row.get("symbol") or ""
    price = row.get("price")
    change = row.get("change")
    change_pct = (
        row.get("change_percent")
        if row.get("change_percent") is not None
        else row.get("changePercent")
    )
    sector = row.get("sector") or ""
    vol = row.get("volume")
    mcap = row.get("market_cap") if row.get("market_cap") is not None else row.get("marketCap")
    parts = [f"{name} ({sym})".strip()]
    if price is not None:
        parts.append(f"현재가 {price}")
    if change is not None or change_pct is not None:
        pct = (
            f"{change_pct:+.2f}%" if isinstance(change_pct, (int, float)) else str(change_pct or "")
        )
        ch = f"{change:+.2f}" if isinstance(change, (int, float)) else str(change or "")
        parts.append(f"등락 {ch} ({pct})".strip())
    if sector:
        parts.append(f"섹터 {sector}")
    if vol:
        parts.append(f"거래량 {vol}")
    if mcap:
        parts.append(f"시가총액 {mcap}")
    parts.append("※ 앱 캐시 시세 기준이며 지연·참고가일 수 있음")
    return ", ".join(p for p in parts if p)


def build_context_block(
    *,
    page_path: str | None,
    symbol: str | None,
    market: str | None,
    quote_row: dict | None = None,
) -> tuple[str, dict | None]:
    """LLM system 보조 텍스트 + UI용 요약 dict."""
    lines: list[str] = []
    ui: dict = {}

    hint = page_hint(page_path)
    if page_path:
        lines.append(f"현재 URL 경로: {page_path}")
    if hint:
        lines.append(f"화면 설명: {hint}")
        ui["pageLabel"] = hint
    m = _normalize_market(market)
    if symbol:
        lines.append(f"사용자가 보고 있는 종목 코드: {symbol}")
        ui["symbol"] = symbol
    if m:
        lines.append(f"시장 구분: {m}")
        ui["market"] = m

    row = quote_row if quote_row is not None else (lookup_quote(symbol, m) if symbol else None)
    if row:
        snippet = format_quote_snippet(row)
        lines.append(f"[앱 시세 스냅샷] {snippet}")
        ui["quote"] = {
            "symbol": row.get("symbol"),
            "name": row.get("name") or row.get("name_ko"),
            "price": row.get("price"),
            "changePercent": row.get("change_percent")
            if row.get("change_percent") is not None
            else row.get("changePercent"),
            "sector": row.get("sector"),
        }
    elif symbol:
        lines.append("해당 종목 시세가 캐시에 없습니다. 실시간 확인은 차트·시세 화면을 안내하세요.")

    if not lines:
        return "", None
    return "[사용자 컨텍스트]\n" + "\n".join(lines), ui or None
