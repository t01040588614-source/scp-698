from app.services.stock_logo_service import (
    CLEARBIT_LOGO,
    FINNHUB_LOGO,
    FMP_STOCK,
    NAVER_KR_LOGO,
    PARQET_LOGO,
    logo_candidate_urls,
    us_fmp_tickers,
)


def test_korea_logo_prefers_naver():
    urls = logo_candidate_urls("korea", "005930")
    assert urls[0] == NAVER_KR_LOGO.format(code="005930")


def test_korea_logo_normalizes_suffix():
    urls = logo_candidate_urls("korea", "005930.KQ")
    assert urls[0] == NAVER_KR_LOGO.format(code="005930")


def test_us_brk_b_prefers_dot_class():
    tickers = us_fmp_tickers("BRK-B")
    assert tickers[0] == "BRK.B"
    urls = logo_candidate_urls("us", "BRK-B")
    assert "BRK.B" in urls[0]


def test_us_plain_ticker():
    assert us_fmp_tickers("AAPL") == ["AAPL"]


def test_us_intl_asia_maps_yahoo_ticker():
    urls = logo_candidate_urls("us", "7203")
    assert urls[0] == FINNHUB_LOGO.format(ticker="7203.T")
    assert FMP_STOCK.format(ticker="7203.T") in urls


def test_us_intl_europe_siemens():
    urls = logo_candidate_urls("us", "SIE")
    assert FMP_STOCK.format(ticker="SIE.DE") in urls


def test_korea_fnguide_before_fmp():
    urls = logo_candidate_urls("korea", "005930")
    assert urls[0] == NAVER_KR_LOGO.format(code="005930")
    assert "fnguide.com" in urls[1]


def test_us_logo_includes_parqet_and_clearbit():
    urls = logo_candidate_urls("us", "META")
    assert FMP_STOCK.format(ticker="META") in urls
    assert PARQET_LOGO.format(ticker="META") in urls
    assert FINNHUB_LOGO.format(ticker="META") in urls
    assert CLEARBIT_LOGO.format(domain="meta.com") in urls
