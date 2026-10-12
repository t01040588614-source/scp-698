import re

import httpx

url = "https://mods.go.kr/lcofNewsPln.es?mid=a60303000000"
r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=25, follow_redirects=True)
html = r.content.decode("utf-8", errors="replace")
print("url", r.url, "len", len(html))
# table rows
rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S | re.I)
data_rows = []
for tr in rows:
    if re.search(r"\d{4}-\d{2}-\d{2}", tr):
        data_rows.append(tr)
print("data rows", len(data_rows))
if data_rows:
    print(data_rows[0][:400])

# find other mid links for news plan
for m in re.findall(r"lcofNewsPln\.es\?mid=a[0-9]+", html):
    pass
mids = sorted(set(re.findall(r"mid=(a[0-9]+)", html)))
print("mids sample", mids[:15])
