import re

import httpx

ym = "2026-10"
url = f"https://www.bok.or.kr/portal/stats/statsPublictSchdul/listCldr.do?date={ym}&menuNo=200775"
r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
text = r.text
for m in re.finditer(r"\$\.(?:ajax|post|get)\(\{[^}]{20,400}\}", text, re.S):
    block = m.group(0).replace("\n", " ")
    if "Schdul" in block or "schdul" in block or "publict" in block.lower():
        print(block[:350])
        print("---")

# broader: any statsPublictSchdul in script
scripts = re.findall(r"<script[^>]*>(.*?)</script>", text, re.S | re.I)
for i, s in enumerate(scripts):
    if "statsPublictSchdul" in s and ("ajax" in s or "url" in s):
        print("script", i, "len", len(s))
        for line in s.splitlines():
            if "url" in line or "ajax" in line or "Schdul" in line:
                print(line.strip()[:200])
