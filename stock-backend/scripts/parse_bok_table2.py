import re

import httpx

ym = "2026-10"
url = f"https://www.bok.or.kr/portal/stats/statsPublictSchdul/listCldr.do?date={ym}&menuNo=200775"
r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=25)
trs = re.findall(r"<tr[^>]*>.*?</tr>", r.text, re.S | re.I)
print("tr count", len(trs))
for tr in trs:
    if "2026-10-" in tr:
        print(tr[:500])
        print("---")
        break
for tr in trs:
    if re.search(r"\d{4}-\d{2}-\d{2}", tr):
        print("sample", tr[:600])
        break
