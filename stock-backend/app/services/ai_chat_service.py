"""AI 투자 어시스턴트 — OpenAI 또는 Google Gemini (키만 설정)."""

from __future__ import annotations

import json
import logging

import httpx

from app.integrations.key_store import get_key
from app.schemas.chat import ChatTurn
from app.services.ai_chat_context import build_context_block, page_hint

logger = logging.getLogger(__name__)

MAX_HISTORY_TURNS = 20
MAX_MESSAGE_LEN = 4000

SYSTEM_PROMPT = """당신은 MarketLens 주식·금융 대시보드의 AI 어시스턴트입니다.
한국어로 답변하세요. 답변은 짧은 요약(1~2문장) 후 필요 시 번호 목록·소제목으로 구조화하세요.
다룰 수 있는 주제: 한국(KOSPI/KOSDAQ)·미국(NYSE/NASDAQ) 시장, 지표, 용어, 차트·스크리너·관심목록·포트폴리오 화면 사용법.
[사용자 컨텍스트]와 [앱 시세 스냅샷]이 주어지면 이를 우선 참고하되, 스냅샷에 없는 수치는 지어내지 마세요.
구체적인 매수·매도·목표가·투자 권유는 하지 마세요. 마지막 줄에 「투자 판단은 본인 책임이며, 제공 정보는 참고용입니다.」를 넣으세요.
실시간 시세가 불확실하면 앱의 시세·차트·종목 상세 화면을 확인하라고 안내하세요."""


def _openai_key() -> str:
    return get_key("OPENAI_API_KEY")


def _gemini_key() -> str:
    return get_key("GEMINI_API_KEY")


def resolve_provider() -> str | None:
    forced = get_key("AI_CHAT_PROVIDER").lower()
    if forced in ("openai", "gemini"):
        if forced == "openai" and _openai_key():
            return "openai"
        if forced == "gemini" and _gemini_key():
            return "gemini"
        return None
    if _openai_key():
        return "openai"
    if _gemini_key():
        return "gemini"
    return None


def is_configured() -> bool:
    return resolve_provider() is not None


def _provider_label(provider: str | None) -> str | None:
    if provider == "openai":
        return "OpenAI"
    if provider == "gemini":
        return "Google Gemini"
    return None


def status_payload() -> dict:
    provider = resolve_provider()
    model = ""
    if provider == "openai":
        model = get_key("OPENAI_MODEL") or "gpt-4o-mini"
    elif provider == "gemini":
        model = get_key("GEMINI_MODEL") or "gemini-2.0-flash"
    return {
        "configured": provider is not None,
        "active": provider is not None,
        "provider": provider,
        "providerLabel": _provider_label(provider),
        "model": model if provider else None,
        "maxMessageLength": MAX_MESSAGE_LEN,
        "maxHistoryTurns": MAX_HISTORY_TURNS,
        "disclaimer": "AI 답변은 투자 조언이 아니며, 시세·뉴스는 지연될 수 있습니다.",
    }


def suggested_prompts(
    page_path: str | None,
    symbol: str | None,
    market: str | None,
) -> list[str]:
    base = page_path.split("?")[0] if page_path else ""
    if symbol:
        return [
            f"{symbol} 종목을 한 문장으로 요약해줘",
            "지금 화면에서 볼 만한 지표·차트 포인트는?",
            "이 종목 섹터에서 같이 보면 좋은 비교 관점은?",
        ]
    if base.startswith("/charts"):
        return [
            "이 차트에서 이동평균선은 어떻게 해석해?",
            "일봉·주봉 전환 시 주의할 점은?",
            "거래량과 가격 추세를 같이 볼 때 팁",
        ]
    if base in ("/korea", "/us"):
        return [
            "오늘 시장 분위기를 읽는 방법",
            "등락률·거래대금 필터 활용법",
            "관심목록에 추가 후 알림 쓰는 법",
        ]
    if base == "/portfolio":
        return [
            "포트폴리오 분산을 점검하는 체크리스트",
            "손익률만 보지 말아야 할 이유",
            "리밸런싱을 생각할 때 참고할 요소",
        ]
    return [
        "PER·PBR 같은 밸류에이션 용어 쉽게 설명해줘",
        "KOSPI와 KOSDAQ 차이는?",
        "MarketLens에서 미국 종목 찾는 방법",
    ]


def context_for_client(
    page_path: str | None,
    symbol: str | None,
    market: str | None,
) -> dict:
    _, ui = build_context_block(page_path=page_path, symbol=symbol, market=market)
    hint = page_hint(page_path)
    out = {
        "pagePath": page_path,
        "pageLabel": hint or (ui or {}).get("pageLabel"),
        "symbol": symbol,
        "market": market,
        "quote": (ui or {}).get("quote"),
        "suggestedPrompts": suggested_prompts(page_path, symbol, market),
    }
    return out


def _trim_history(history: list[ChatTurn]) -> list[ChatTurn]:
    cleaned: list[ChatTurn] = []
    for turn in history[-MAX_HISTORY_TURNS:]:
        role = turn.role.strip().lower()
        if role not in ("user", "assistant"):
            continue
        text = turn.content.strip()
        if not text:
            continue
        cleaned.append(ChatTurn(role=role, content=text[:MAX_MESSAGE_LEN]))
    return cleaned


def _api_error_message(provider: str, status: int, body: str) -> str:
    detail = body[:800]
    try:
        data = json.loads(body)
        if provider == "openai":
            err = data.get("error") or {}
            msg = err.get("message") or err.get("code")
            if msg:
                return f"OpenAI API 오류 ({status}): {msg}"
        if provider == "gemini":
            err = data.get("error") or {}
            msg = err.get("message")
            if msg:
                return f"Gemini API 오류 ({status}): {msg}"
    except json.JSONDecodeError:
        pass
    return f"{provider} API 오류 ({status})"


async def _chat_openai(
    message: str,
    history: list[ChatTurn],
    context_block: str,
) -> tuple[str, str]:
    api_key = _openai_key()
    base = (get_key("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    model = get_key("OPENAI_MODEL") or "gpt-4o-mini"

    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if context_block:
        messages.append({"role": "system", "content": context_block})
    for turn in history:
        messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": message.strip()})

    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            f"{base}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages, "temperature": 0.35, "max_tokens": 1400},
        )
    if resp.status_code >= 400:
        logger.warning("OpenAI chat error %s: %s", resp.status_code, resp.text[:500])
        raise RuntimeError(_api_error_message("OpenAI", resp.status_code, resp.text))
    data = resp.json()
    try:
        reply = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("OpenAI 응답 형식 오류") from exc
    return reply, model


async def _chat_gemini(
    message: str,
    history: list[ChatTurn],
    context_block: str,
) -> tuple[str, str]:
    api_key = _gemini_key()
    model = get_key("GEMINI_MODEL") or "gemini-2.0-flash"
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )

    parts_system = SYSTEM_PROMPT
    if context_block:
        parts_system = f"{SYSTEM_PROMPT}\n\n{context_block}"

    contents: list[dict] = []
    for turn in history:
        role = "user" if turn.role == "user" else "model"
        contents.append({"role": role, "parts": [{"text": turn.content}]})
    contents.append({"role": "user", "parts": [{"text": message.strip()}]})

    body = {
        "systemInstruction": {"parts": [{"text": parts_system}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.35, "maxOutputTokens": 1400},
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(url, json=body)
    if resp.status_code >= 400:
        logger.warning("Gemini chat error %s: %s", resp.status_code, resp.text[:500])
        raise RuntimeError(_api_error_message("Gemini", resp.status_code, resp.text))
    data = resp.json()
    try:
        reply = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("Gemini 응답 형식 오류") from exc
    return reply, model


async def chat(
    message: str,
    history: list[ChatTurn] | None = None,
    *,
    page_path: str | None = None,
    symbol: str | None = None,
    market: str | None = None,
    quote_row: dict | None = None,
) -> tuple[str, str, str, dict | None]:
    provider = resolve_provider()
    if not provider:
        raise RuntimeError("AI 챗봇 API 키가 설정되지 않았습니다. OPENAI_API_KEY 또는 GEMINI_API_KEY를 입력하세요.")

    text = message.strip()[:MAX_MESSAGE_LEN]
    if not text:
        raise RuntimeError("메시지가 비어 있습니다.")

    context_block, ui_ctx = build_context_block(
        page_path=page_path,
        symbol=symbol,
        market=market,
        quote_row=quote_row,
    )
    hist = _trim_history(history or [])
    if provider == "openai":
        reply, model = await _chat_openai(text, hist, context_block)
        return reply, provider, model, ui_ctx
    reply, model = await _chat_gemini(text, hist, context_block)
    return reply, provider, model, ui_ctx
