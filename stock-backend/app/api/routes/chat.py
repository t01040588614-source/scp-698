from fastapi import APIRouter, HTTPException, Query

from app.schemas.chat import ChatContextResponse, ChatRequest, ChatResponse
from app.services import ai_chat_service
from app.services.ai_chat_context import build_context_block, lookup_quote, page_hint
from app.services.market_data import market_data

router = APIRouter(tags=["AI 챗봇"])


@router.get("/status")
async def chat_status():
    return ai_chat_service.status_payload()


@router.get("/context", response_model=ChatContextResponse)
async def chat_context(
    page_path: str | None = Query(None, alias="pagePath", max_length=256),
    symbol: str | None = Query(None, max_length=32),
    market: str | None = Query(None, max_length=16),
):
    sym = symbol.strip() if symbol else None
    if sym:
        await market_data.ensure_symbol_fresh(sym)
    row = lookup_quote(sym, market) if sym else None
    _, ui = build_context_block(page_path=page_path, symbol=sym, market=market, quote_row=row)

    return {
        "pagePath": page_path,
        "pageLabel": page_hint(page_path) or (ui or {}).get("pageLabel"),
        "symbol": sym,
        "market": market,
        "quote": (ui or {}).get("quote"),
        "suggestedPrompts": ai_chat_service.suggested_prompts(page_path, sym, market),
    }


@router.post("", response_model=ChatResponse)
async def chat_completion(body: ChatRequest):
    if not ai_chat_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI 챗봇이 비활성화되어 있습니다. /tools/integrations 에서 OpenAI 또는 Gemini API 키를 설정하세요.",
        )
    quote_row = None
    if body.symbol:
        sym = body.symbol.strip()
        await market_data.ensure_symbol_fresh(sym)
        quote_row = lookup_quote(sym, body.market)
    try:
        reply, provider, model, ctx = await ai_chat_service.chat(
            body.message,
            body.history,
            page_path=body.page_path,
            symbol=body.symbol,
            market=body.market,
            quote_row=quote_row,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ChatResponse(reply=reply, provider=provider, model=model, context=ctx)
