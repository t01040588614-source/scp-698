from datetime import UTC, datetime


def utc_now() -> datetime:
    """Timezone-aware UTC now (JWT, cache timestamps)."""
    return datetime.now(UTC)
