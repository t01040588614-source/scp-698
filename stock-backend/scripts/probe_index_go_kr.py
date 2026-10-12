import httpx

urls = [
    "https://www.index.go.kr/unity/p_main/Main.do",
    "https://www.index.go.kr/unity/p_press/ScheduleList.do",
]
h = {"User-Agent": "Mozilla/5.0"}
for u in urls:
    r = httpx.get(u, headers=h, timeout=15, follow_redirects=True)
    print(r.status_code, u, len(r.content))
    if "Schedule" in r.text or "공표" in r.text:
        print("  relevant")
