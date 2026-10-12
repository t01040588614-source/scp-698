"""기존 users 테이블에 회원가입 확장 컬럼 추가 (create_all만으로는 반영되지 않음)."""

from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection


def migrate_users_table(connection: Connection) -> None:
    inspector = inspect(connection)
    if not inspector.has_table("users"):
        return

    existing = {c["name"] for c in inspector.get_columns("users")}
    dialect = connection.dialect.name

    columns: list[tuple[str, str, str]] = [
        ("phone", "VARCHAR(20)", "VARCHAR(20)"),
        ("birth_date", "DATE", "DATE"),
        ("marketing_consent", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT 0"),
        ("terms_agreed_at", "TIMESTAMP WITH TIME ZONE", "DATETIME"),
        ("phone_verified", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT 0"),
    ]

    for name, pg_type, sqlite_type in columns:
        if name in existing:
            continue
        col_type = sqlite_type if dialect == "sqlite" else pg_type
        connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {col_type}"))

    inspector = inspect(connection)
    if "phone" in {c["name"] for c in inspector.get_columns("users")}:
        try:
            connection.execute(
                text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone ON users (phone)")
            )
        except Exception:
            pass
