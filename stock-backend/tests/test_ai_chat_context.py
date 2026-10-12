from app.services.ai_chat_context import build_context_block, format_quote_snippet, page_hint


def test_page_hint_korea():
    assert "한국" in (page_hint("/korea") or "")


def test_format_quote_snippet():
    text = format_quote_snippet(
        {
            "symbol": "005930",
            "name": "삼성전자",
            "price": 70000,
            "change_percent": 1.2,
            "sector": "반도체",
        }
    )
    assert "005930" in text
    assert "삼성전자" in text


def test_build_context_block_with_symbol():
    block, ui = build_context_block(
        page_path="/quote/korea/005930",
        symbol="005930",
        market="korea",
        quote_row={
            "symbol": "005930",
            "name": "삼성전자",
            "price": 70000,
            "change_percent": -0.5,
        },
    )
    assert "[사용자 컨텍스트]" in block
    assert ui and ui.get("quote", {}).get("symbol") == "005930"
