"""환경 변수 + 로컬 JSON — API 키 통합 조회·저장."""

from __future__ import annotations

import json
import os
from pathlib import Path
from threading import Lock

from app.core.config import settings

_lock = Lock()
_file_keys: dict[str, str] | None = None

# env 이름 → (별칭 env 목록)
_KEY_ALIASES: dict[str, list[str]] = {
    "KIS_APP_KEY": ["KOREA_STOCK_API_KEY"],
    "KIS_APP_SECRET": ["KOREA_STOCK_API_SECRET"],
    "FINNHUB_API_KEY": ["US_STOCK_API_KEY"],
}


def keys_file_path() -> Path:
    raw = getattr(settings, "INTEGRATIONS_KEYS_FILE", "data/integration_keys.json")
    path = Path(raw)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path
    return path


def _load_file() -> dict[str, str]:
    global _file_keys
    if _file_keys is not None:
        return _file_keys
    path = keys_file_path()
    if not path.exists():
        _file_keys = {}
        return _file_keys
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            _file_keys = {str(k): str(v) for k, v in data.items() if v is not None}
        else:
            _file_keys = {}
    except (json.JSONDecodeError, OSError):
        _file_keys = {}
    return _file_keys


def reload_file_keys() -> None:
    global _file_keys
    with _lock:
        _file_keys = None
        _load_file()


def _settings_value(name: str) -> str:
    raw = getattr(settings, name, "")
    if raw is None:
        return ""
    return str(raw).strip()


def get_key(name: str) -> str:
    val = os.environ.get(name, "").strip()
    if val:
        return val
    for alias in _KEY_ALIASES.get(name, []):
        val = os.environ.get(alias, "").strip()
        if val:
            return val
    val = _load_file().get(name, "").strip()
    if val:
        return val
    val = _settings_value(name)
    if val:
        return val
    for alias in _KEY_ALIASES.get(name, []):
        val = _settings_value(alias)
        if val:
            return val
    return ""


def mask_value(value: str) -> str | None:
    if not value:
        return None
    if len(value) <= 6:
        return "***"
    return f"{value[:3]}…{value[-2:]}"


def key_source(name: str) -> str:
    if os.environ.get(name, "").strip():
        return "env"
    for alias in _KEY_ALIASES.get(name, []):
        if os.environ.get(alias, "").strip():
            return "env"
    if _load_file().get(name, "").strip():
        return "file"
    if _settings_value(name):
        return "env"
    for alias in _KEY_ALIASES.get(name, []):
        if _settings_value(alias):
            return "env"
    return "empty"


def save_keys(updates: dict[str, str]) -> dict[str, str]:
    """파일에 키 병합 저장 (env에 있는 키는 덮어쓰지 않음)."""
    if not settings.integrations_allow_ui_save():
        raise PermissionError("UI 키 저장이 비활성화되어 있습니다")

    path = keys_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    with _lock:
        current = dict(_load_file())
        for key, value in updates.items():
            if not key or not key.isupper():
                continue
            if os.environ.get(key, "").strip():
                continue
            cleaned = (value or "").strip()
            if cleaned:
                current[key] = cleaned
            elif key in current:
                del current[key]
        path.write_text(json.dumps(current, indent=2, ensure_ascii=False), encoding="utf-8")
        reload_file_keys()
    return dict(_load_file())
