"""유럽 주요 종목 — Yahoo 티커"""

from app.data.asia_universe import IntlSymbolMeta


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


EUROPE_UNIVERSE: list[IntlSymbolMeta] = [
    _row("SAP", "SAP.DE", "SAP", "XETRA", "EUR", "기술"),
    _row("SIE", "SIE.DE", "Siemens", "XETRA", "EUR", "산업재"),
    _row("ALV", "ALV.DE", "Allianz", "XETRA", "EUR", "금융"),
    _row("BAS", "BAS.DE", "BASF", "XETRA", "EUR", "소재"),
    _row("MBG", "MBG.DE", "Mercedes-Benz", "XETRA", "EUR", "소비재"),
    _row("ASML", "ASML.AS", "ASML", "AEX", "EUR", "기술"),
    _row("MC", "MC.PA", "LVMH", "EPA", "EUR", "소비재"),
    _row("OR", "OR.PA", "L'Oréal", "EPA", "EUR", "소비재"),
    _row("SAN", "SAN.PA", "Sanofi", "EPA", "EUR", "헬스케어"),
    _row("TTE", "TTE.PA", "TotalEnergies", "EPA", "EUR", "에너지"),
    _row("SHEL", "SHEL.L", "Shell", "LSE", "GBP", "에너지"),
    _row("AZN", "AZN.L", "AstraZeneca", "LSE", "GBP", "헬스케어"),
    _row("HSBA", "HSBA.L", "HSBC", "LSE", "GBP", "금융"),
    _row("ULVR", "ULVR.L", "Unilever", "LSE", "GBP", "소비재"),
    _row("RIO", "RIO.L", "Rio Tinto", "LSE", "GBP", "소재"),
    _row("NESN", "NESN.SW", "Nestlé", "SIX", "CHF", "소비재"),
    _row("NOVN", "NOVN.SW", "Novartis", "SIX", "CHF", "헬스케어"),
    _row("ROG", "ROG.SW", "Roche", "SIX", "CHF", "헬스케어"),
    _row("VOLV-B", "VOLV-B.ST", "Volvo B", "OMX", "SEK", "산업재"),
    _row("ERIC-B", "ERIC-B.ST", "Ericsson B", "OMX", "SEK", "기술"),
]
