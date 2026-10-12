"""아시아(한국 제외) 주요 종목 — Yahoo 티커"""

from typing import TypedDict


class IntlSymbolMeta(TypedDict):
    symbol: str
    yahoo: str
    name: str
    exchange: str
    currency: str
    sector: str


def _row(
    symbol: str,
    yahoo: str,
    name: str,
    exchange: str,
    currency: str,
    sector: str = "기술",
) -> IntlSymbolMeta:
    return {
        "symbol": symbol,
        "yahoo": yahoo,
        "name": name,
        "exchange": exchange,
        "currency": currency,
        "sector": sector,
    }


ASIA_UNIVERSE: list[IntlSymbolMeta] = [
    _row("7203", "7203.T", "토요타", "TSE", "JPY", "소비재"),
    _row("6758", "6758.T", "소니 그룹", "TSE", "JPY", "기술"),
    _row("9984", "9984.T", "SoftBank Group", "TSE", "JPY", "통신"),
    _row("6861", "6861.T", "키엔스", "TSE", "JPY", "기술"),
    _row("8306", "8306.T", "MUFG", "TSE", "JPY", "금융"),
    _row("9432", "9432.T", "NTT", "TSE", "JPY", "통신"),
    _row("8035", "8035.T", "도쿄 일렉트론", "TSE", "JPY", "기술"),
    _row("6098", "6098.T", "리크루트", "TSE", "JPY", "기술"),
    _row("4063", "4063.T", "신에츠화학", "TSE", "JPY", "소재"),
    _row("4519", "4519.T", "中外製薬", "TSE", "JPY", "헬스케어"),
    _row("2330", "2330.TW", "TSMC", "TWSE", "TWD", "기술"),
    _row("2317", "2317.TW", "Hon Hai", "TWSE", "TWD", "기술"),
    _row("2454", "2454.TW", "MediaTek", "TWSE", "TWD", "기술"),
    _row("0700", "0700.HK", "Tencent", "HKEX", "HKD", "기술"),
    _row("9988", "9988.HK", "Alibaba", "HKEX", "HKD", "소비재"),
    _row("3690", "3690.HK", "Meituan", "HKEX", "HKD", "소비재"),
    _row("1810", "1810.HK", "Xiaomi", "HKEX", "HKD", "기술"),
    _row("1299", "1299.HK", "AIA", "HKEX", "HKD", "금융"),
    _row("D05", "D05.SI", "DBS Group", "SGX", "SGD", "금융"),
    _row("O39", "O39.SI", "OCBC", "SGX", "SGD", "금융"),
]
