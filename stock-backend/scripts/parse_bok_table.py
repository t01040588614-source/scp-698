import re
from datetime import date

import httpx

ROW_RE = re.compile(
    r"<tr>\s*<td[^>]*>(\d{4}-\d{2}-\d{2})</td>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>\s*</tr>",
    re.S | re.I,
)


def strip_tags(html: str) -> str:
    text = re.sub(r"<br\s*/?>", " · ", html, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def fetch_bok_month(ym: str) -> list[dict]:
    url = f"https://www.bok.or.kr/portal/stats/statsPublictSchdul/listCldr.do?date={ym}&menuNo=200775"
    r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=25)
    r.raise_for_status()
    rows = []
    for d, tm, stats_html, _note in ROW_RE.findall(r.text):
        event = strip_tags(stats_html)
        if not event:
            continue
        rows.append({"date": d, "time": tm.strip(), "event": event})
    return rows


if __name__ == "__main__":
    all_rows = fetch_bok_month("2026-10")
    start, end = date(2026, 10, 1), date(2026, 10, 31)
    filt = [x for x in all_rows if start <= date.fromisoformat(x["date"]) <= end]
    print("total parsed", len(all_rows), "oct", len(filt))
    for x in filt[:15]:
        print(x)
