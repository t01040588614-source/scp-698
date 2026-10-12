import re

import httpx

candidates = [
    "https://kostat.go.kr/portal/korea/kor_nw/1/1/index.board?bmode=list&aSeq=",
    "https://www.kostat.go.kr/portal/eng/pressReleases/1/index.board",
    "https://www.kostat.go.kr/Menu.es?mid=a10101000000",
    "https://kostat.go.kr/portal/korea/kor_nw/economyCalendar/list.do",
]
h = {"User-Agent": "Mozilla/5.0"}
for u in candidates:
    try:
        r = httpx.get(u, headers=h, timeout=15, follow_redirects=True)
        print(r.status_code, u[:70], len(r.content))
    except Exception as e:
        print("err", e)

# search kostat for calendar keyword in main page
r = httpx.get("https://www.kostat.go.kr/Menu.es?mid=a10101000000", headers=h, timeout=15)
for m in re.findall(r"mid=a[0-9]+", r.text):
    pass
if "공표" in r.text:
    print("has gongpyo on menu page")
