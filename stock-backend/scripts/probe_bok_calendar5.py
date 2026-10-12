import re

import httpx

ym = "2026-10"
url = f"https://www.bok.or.kr/portal/stats/statsPublictSchdul/listCldr.do?date={ym}&menuNo=200775"
r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
text = r.text
dates = sorted(set(re.findall(r"2026-10-\d{2}", text)))
print("oct dates in html", len(dates), dates[:20])

# find tbody snippet
idx = text.find("월간통계공표일정 목록")
if idx >= 0:
    snippet = text[idx : idx + 8000]
    # strip tags lightly
    plain = re.sub(r"<[^>]+>", "|", snippet)
    plain = re.sub(r"\|+", "|", plain)
    print(plain[:2000])
