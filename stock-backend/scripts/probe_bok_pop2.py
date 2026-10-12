import httpx

sid = "6454"
url = "https://www.bok.or.kr/portal/stats/statsPublictSchdul/listCldr.do?date=2026-10&menuNo=200775"
candidates = [
    f"https://www.bok.or.kr/portal/stats/statsPublictSchdul/view.json?id={sid}",
    f"https://www.bok.or.kr/portal/stats/statsPublictSchdul/view.json?schdulId={sid}",
    f"https://www.bok.or.kr/portal/stats/statsPublictSchdul/view.do?id={sid}",
]
h = {"User-Agent": "Mozilla/5.0", "Referer": url, "X-Requested-With": "XMLHttpRequest"}
for u in candidates:
    for method in ("get", "post"):
        fn = httpx.get if method == "get" else httpx.post
        rr = fn(u, headers=h, timeout=15)
        print(method, u.split("/")[-1], rr.status_code, rr.headers.get("content-type"), len(rr.content))
        if rr.status_code == 200 and "json" in (rr.headers.get("content-type") or ""):
            open("bok_pop.json", "wb").write(rr.content)
