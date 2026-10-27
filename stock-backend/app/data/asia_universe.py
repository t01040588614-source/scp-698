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
    _row("7203", "7203.T", "Toyota Motor Corporation", "TSE", "JPY", "소비재"),
    _row("6758", "6758.T", "Sony Group Corporation", "TSE", "JPY", "기술"),
    _row("9984", "9984.T", "SoftBank Group Corp.", "TSE", "JPY", "통신"),
    _row("6861", "6861.T", "Keyence Corporation", "TSE", "JPY", "기술"),
    _row("8306", "8306.T", "Mitsubishi UFJ Financial Group, Inc.", "TSE", "JPY", "금융"),
    _row("9432", "9432.T", "Nippon Telegraph and Telephone Corporation", "TSE", "JPY", "통신"),
    _row("8035", "8035.T", "Tokyo Electron Limited", "TSE", "JPY", "기술"),
    _row("6098", "6098.T", "Recruit Holdings Co., Ltd.", "TSE", "JPY", "기술"),
    _row("4063", "4063.T", "Shin-Etsu Chemical Co., Ltd.", "TSE", "JPY", "소재"),
    _row("4519", "4519.T", "Chugai Pharmaceutical Co., Ltd.", "TSE", "JPY", "헬스케어"),
    _row(
        "2330",
        "2330.TW",
        "Taiwan Semiconductor Manufacturing Company Limited",
        "TWSE",
        "TWD",
        "기술",
    ),
    _row("2317", "2317.TW", "Hon Hai Precision Industry Co., Ltd.", "TWSE", "TWD", "기술"),
    _row("2454", "2454.TW", "MediaTek Inc.", "TWSE", "TWD", "기술"),
    _row("0700", "0700.HK", "Tencent Holdings Limited", "HKEX", "HKD", "기술"),
    _row("9988", "9988.HK", "Alibaba Group Holding Limited", "HKEX", "HKD", "소비재"),
    _row("3690", "3690.HK", "Meituan", "HKEX", "HKD", "소비재"),
    _row("1810", "1810.HK", "Xiaomi Corporation", "HKEX", "HKD", "기술"),
    _row("1299", "1299.HK", "AIA Group Limited", "HKEX", "HKD", "금융"),
    _row("D05", "D05.SI", "DBS Group Holdings Ltd", "SGX", "SGD", "금융"),
    _row("O39", "O39.SI", "Oversea-Chinese Banking Corporation Limited", "SGX", "SGD", "금융"),
]
