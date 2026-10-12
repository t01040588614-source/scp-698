import httpx

link = "https://news.google.com/rss/articles/CBMiiAFBVV95cUxOejJtWjZ0b3lzTXIyQXY0MHdkV3hwWHBEMVhlV2hBT2hkRFUzc3I5dFpBUGxvSTBnVzV2S0F4TXplS243WkN5"

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
}

with httpx.Client(follow_redirects=True, timeout=20) as c:
    r = c.get(link, headers=headers)
    print("status", r.status_code, "url", str(r.url))
    print("history", [str(h.url) for h in r.history])
