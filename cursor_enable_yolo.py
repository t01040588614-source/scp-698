"""Cursor Run Everything (터미널 Run 버튼 없음). Cursor 완전 종료 후 실행."""
import json
import sqlite3
from pathlib import Path

STORAGE_KEY = (
    "src.vs.platform.reactivestorage.browser.reactiveStorageServiceImpl"
    ".persistentStorage.applicationUser"
)
DB = Path.home() / "AppData" / "Roaming" / "Cursor" / "User" / "globalStorage" / "state.vscdb"

con = sqlite3.connect(DB)
cur = con.cursor()
cur.execute("SELECT value FROM ItemTable WHERE key=?", (STORAGE_KEY,))
row = cur.fetchone()
if not row:
    raise SystemExit("state.vscdb not found")

data = json.loads(row[0])
cs = data.setdefault("composerState", {})
cs["yoloEnableRunEverything"] = True
cs["enableSmartAuto"] = False
cs["doNotShowFullYoloModeWarningAgain"] = True
cs["doNotShowYoloModeWarningAgain"] = True

for mode in cs.get("modes4", []):
    if mode.get("id") == "agent":
        mode["autoRun"] = True
        mode["fullAutoRun"] = True
        mode["smartModeAutoRun"] = False

cur.execute(
    "UPDATE ItemTable SET value=? WHERE key=?",
    (json.dumps(data, separators=(",", ":"), ensure_ascii=False), STORAGE_KEY),
)
con.commit()
con.close()
print("OK: Run Everything enabled. Cursor를 다시 실행하세요.")
