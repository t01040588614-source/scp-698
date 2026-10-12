from datetime import date

from app.services.kr_economic_calendar import _parse_kostat_html, _parse_month_html
from app.services.us_economic_calendar import _parse_bls_html, _parse_census_html, _parse_fomc_html

BOK_SNIPPET = """
<tr>
    <td>2026-10-07</td>
    <td>12:00</td>
    <td class="title"><p>2026년 2/4분기 자금순환(잠정)</p></td>
    <td class="tal"></td>
</tr>
"""

FOMC_SNIPPET = """
2026 FOMC Meetings
<div class="fomc-meeting">
<a href="/newsevents/pressreleases/monetary20260318a.htm">HTML</a>
</div>
"""


def test_bok_parse_row():
    rows = _parse_month_html(BOK_SNIPPET, date(2026, 10, 1), date(2026, 10, 31))
    assert len(rows) == 1
    assert rows[0]["country"] == "KR"
    assert "자금순환" in rows[0]["event"]


KOSTAT_SNIPPET = """
<tr>
<td class="center">2026-10-02( 금 )</td>
<td>2026년 9월 소비자물가 동향</td>
<td class="center">경제조사과</td>
</tr>
"""


def test_kostat_parse_row():
    rows = _parse_kostat_html(KOSTAT_SNIPPET, date(2026, 10, 1), date(2026, 10, 31))
    assert len(rows) == 1
    assert rows[0]["country"] == "KR"
    assert rows[0]["time"] == "08:00"
    assert rows[0]["impact"] == "high"
    assert "소비자물가" in rows[0]["event"]


def test_fomc_parse_statement_date():
    rows = _parse_fomc_html(FOMC_SNIPPET, date(2026, 1, 1), date(2026, 12, 31))
    assert len(rows) == 1
    assert rows[0]["country"] == "US"
    assert rows[0]["impact"] == "high"


CENSUS_SNIPPET = """
<tr height="20">
<td height="20"><a href="/foreign-trade/">U.S. International Trade in Goods and Services</a></td>
<td sorttable_customkey="202610060830">October 6, 2026</td>
<td>8:30 AM</td>
<td>July 2026</td>
</tr>
"""

BLS_SNIPPET = """
<tr>
<td class="date">Friday, October 2, 2026</td>
<td class="time">08:30 AM</td>
<td class="release">Employment Situation for September 2026</td>
</tr>
"""


def test_census_parse_row():
    rows = _parse_census_html(CENSUS_SNIPPET, date(2026, 10, 1), date(2026, 10, 31))
    assert len(rows) == 1
    assert rows[0]["country"] == "US"
    assert "International Trade" in rows[0]["event"]
    assert rows[0]["source"] == "us_census"


def test_bls_parse_row():
    rows = _parse_bls_html(BLS_SNIPPET, date(2026, 10, 1), date(2026, 10, 31))
    assert len(rows) == 1
    assert rows[0]["country"] == "US"
    assert rows[0]["impact"] == "high"
    assert "Employment" in rows[0]["event"]
