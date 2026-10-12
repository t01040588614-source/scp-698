import re

import httpx

url = "https://mods.go.kr/lcofNewsPln.es?mid=a60101000000"
r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=25)
html = r.content.decode("utf-8", errors="replace")
rows = re.findall(
    r'<td[^>]*class="center"[^>]*>\s*(\d{4}-\d{2}-\d{2})[^<]*</td>\s*<td[^>]*>(.*?)</td>',
    html,
    re.S | re.I,
)
print("parsed", len(rows))
for d, title in rows[:10]:
    t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", title)).strip()
    print(d, t[:60])
