"""미국 티커 → 회사 도메인 (Clearbit 로고 폴백)."""

from __future__ import annotations

# seed_stocks US_NAMES 와 동일 유니버스 기준
US_LOGO_DOMAIN: dict[str, str] = {
    "AAPL": "apple.com",
    "MSFT": "microsoft.com",
    "GOOGL": "abc.xyz",
    "GOOG": "abc.xyz",
    "AMZN": "amazon.com",
    "NVDA": "nvidia.com",
    "META": "meta.com",
    "TSLA": "tesla.com",
    "BRK-B": "berkshirehathaway.com",
    "BRK.B": "berkshirehathaway.com",
    "JPM": "jpmorganchase.com",
    "V": "visa.com",
    "UNH": "unitedhealthgroup.com",
    "XOM": "exxonmobil.com",
    "JNJ": "jnj.com",
    "WMT": "walmart.com",
    "MA": "mastercard.com",
    "PG": "pg.com",
    "HD": "homedepot.com",
    "AVGO": "broadcom.com",
    "LLY": "lilly.com",
    "COST": "costco.com",
    "MRK": "merck.com",
    "ABBV": "abbvie.com",
    "PEP": "pepsico.com",
    "KO": "coca-cola.com",
    "AMD": "amd.com",
    "NFLX": "netflix.com",
    "CRM": "salesforce.com",
    "ORCL": "oracle.com",
    "ADBE": "adobe.com",
    "INTC": "intel.com",
    "QCOM": "qualcomm.com",
    "TXN": "ti.com",
    "BAC": "bankofamerica.com",
    "DIS": "disney.com",
    "CSCO": "cisco.com",
}


def us_logo_domain(symbol: str) -> str | None:
    sym = symbol.strip().upper()
    if not sym:
        return None
    domain = US_LOGO_DOMAIN.get(sym)
    if domain:
        return domain
    if "-" in sym:
        domain = US_LOGO_DOMAIN.get(sym.replace("-", "."))
        if domain:
            return domain
    return None
