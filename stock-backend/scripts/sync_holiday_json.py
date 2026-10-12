"""백엔드 CSV → 프론트 exchangeHolidays.json 동기화."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.services.exchange_calendar import export_holiday_dates_for_frontend, reload_calendars

OUT = ROOT.parent / "my-frontend" / "src" / "data" / "exchangeHolidays.json"


def main() -> None:
    reload_calendars()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(export_holiday_dates_for_frontend(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
