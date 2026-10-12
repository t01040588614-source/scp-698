import re

import httpx

ym = "2026-10"
url = f"https://www.bok.or.kr/portal/stats/statsPublictSchdul/listCldr.do?date={ym}&menuNo=200775"
r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
text = r.text
for pat in [
    r"url\s*:\s*['\"]([^'\"]+statsPublictSchdul[^'\"]+)['\"]",
    r"statsPublictSchdul/[a-zA-Z]+\.(?:do|json)[^'\"]*",
]:
    found = set(re.findall(pat, text))
    for f in sorted(found):
        if len(f) < 150:
            print(f)

# parse HTML table list section - rows with publictDe
rows = re.findall(
    r"<tr[^>]*>\s*<td[^>]*>(\d{4}-\d{2}-\d{2})</td>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>([^<]*)</td>",
    text,
    flags=re.I,
)
print("table rows", len(rows))
for row in rows[:8]:
    print(row)
