from app.services import ai_chat_service


def test_chat_not_configured_when_keys_empty(monkeypatch):
    monkeypatch.setattr("app.services.ai_chat_service.get_key", lambda _name: "")
    assert ai_chat_service.resolve_provider() is None
    assert ai_chat_service.is_configured() is False
    payload = ai_chat_service.status_payload()
    assert payload["configured"] is False


def test_prefers_openai_when_both_keys(monkeypatch):
    def fake_get(name: str) -> str:
        if name == "OPENAI_API_KEY":
            return "sk-test"
        if name == "GEMINI_API_KEY":
            return "gem-test"
        if name == "AI_CHAT_PROVIDER":
            return ""
        if name == "OPENAI_MODEL":
            return ""
        return ""

    monkeypatch.setattr("app.services.ai_chat_service.get_key", fake_get)
    assert ai_chat_service.resolve_provider() == "openai"
