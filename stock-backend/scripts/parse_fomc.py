import re

import httpx

r = httpx.get(
    "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    headers={"User-Agent": "Mozilla/5.0"},
    timeout=25,
)
text = r.text
# year 2026 section
idx = text.find("2026 FOMC")
print("idx", idx)
print(text[idx : idx + 2000] if idx >= 0 else "no")
dates = re.findall(r"(\d{1,2})[-–](\d{1,2})?\s*\*?\s*(?:\([^)]*\))?\s*(?:\n|<)", text[idx : idx + 5000] if idx >= 0 else "")
print("dates sample", dates[:10])
