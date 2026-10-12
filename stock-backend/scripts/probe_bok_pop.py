import re

import httpx

url = "https://www.bok.or.kr/portal/stats/statsPublictSchdul/listCldr.do?date=2026-10&menuNo=200775"
r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=25)
for m in re.finditer(r"schdulPop\('(\d+)'\)", r.text):
    sid = m.group(1)
    print("id", sid)
    break

# try pop endpoints
for ep in [
    "https://www.bok.or.kr/portal/stats/statsPublictSchdul/view.json",
    "https://www.bok.or.kr/portal/stats/statsPublictSchdul/schdulPop.json",
    "https://www.bok.or.kr/portal/stats/statsPublictSchdul/detail.json",
]:
    for payload in [{"schdulId": sid}, {"id": sid}, {"statsPublictSchdulId": sid}]:
        rr = httpx.post(
            ep,
            data=payload,
            headers={
                "User-Agent": "Mozilla/5.0",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": url,
            },
            timeout=15,
        )
        if rr.status_code == 200 and "StatisticSearch" not in rr.text and len(rr.text) < 5000:
            print(ep, payload, rr.text[:400])
