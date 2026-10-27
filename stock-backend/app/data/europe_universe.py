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
    _row("SAP", "SAP.DE", "SAP SE", "XETRA", "EUR", "기술"),
    _row("SIE", "SIE.DE", "Siemens AG", "XETRA", "EUR", "산업재"),
    _row("ALV", "ALV.DE", "Allianz SE", "XETRA", "EUR", "금융"),
    _row("BAS", "BAS.DE", "BASF SE", "XETRA", "EUR", "소재"),
    _row("MBG", "MBG.DE", "Mercedes-Benz Group AG", "XETRA", "EUR", "소비재"),
    _row("ASML", "ASML.AS", "ASML Holding N.V.", "AEX", "EUR", "기술"),
    _row("MC", "MC.PA", "LVMH Moët Hennessy Louis Vuitton SE", "EPA", "EUR", "소비재"),
    _row("OR", "OR.PA", "L'Oréal S.A.", "EPA", "EUR", "소비재"),
    _row("SAN", "SAN.PA", "Sanofi", "EPA", "EUR", "헬스케어"),
    _row("TTE", "TTE.PA", "TotalEnergies SE", "EPA", "EUR", "에너지"),
    _row("SHEL", "SHEL.L", "Shell plc", "LSE", "GBP", "에너지"),
    _row("AZN", "AZN.L", "AstraZeneca PLC", "LSE", "GBP", "헬스케어"),
    _row("HSBA", "HSBA.L", "HSBC Holdings plc", "LSE", "GBP", "금융"),
    _row("ULVR", "ULVR.L", "Unilever PLC", "LSE", "GBP", "소비재"),
    _row("RIO", "RIO.L", "Rio Tinto Group", "LSE", "GBP", "소재"),
    _row("NESN", "NESN.SW", "Nestlé S.A.", "SIX", "CHF", "소비재"),
    _row("NOVN", "NOVN.SW", "Novartis AG", "SIX", "CHF", "헬스케어"),
    _row("ROG", "ROG.SW", "Roche Holding AG", "SIX", "CHF", "헬스케어"),
    _row("VOLV-B", "VOLV-B.ST", "Volvo AB (publ)", "OMX", "SEK", "산업재"),
    _row("ERIC-B", "ERIC-B.ST", "Telefonaktiebolaget LM Ericsson (publ)", "OMX", "SEK", "기술"),
]
