/** 백엔드 us_logo_domains.py 와 동기 — Clearbit 로고 폴백 */

export const US_LOGO_DOMAIN: Record<string, string> = {
  AAPL: "apple.com",
  MSFT: "microsoft.com",
  GOOGL: "abc.xyz",
  GOOG: "abc.xyz",
  AMZN: "amazon.com",
  NVDA: "nvidia.com",
  META: "meta.com",
  TSLA: "tesla.com",
  "BRK-B": "berkshirehathaway.com",
  "BRK.B": "berkshirehathaway.com",
  JPM: "jpmorganchase.com",
  V: "visa.com",
  UNH: "unitedhealthgroup.com",
  XOM: "exxonmobil.com",
  JNJ: "jnj.com",
  WMT: "walmart.com",
  MA: "mastercard.com",
  PG: "pg.com",
  HD: "homedepot.com",
  AVGO: "broadcom.com",
  LLY: "lilly.com",
  COST: "costco.com",
  MRK: "merck.com",
  ABBV: "abbvie.com",
  PEP: "pepsico.com",
  KO: "coca-cola.com",
  AMD: "amd.com",
  NFLX: "netflix.com",
  CRM: "salesforce.com",
  ORCL: "oracle.com",
  ADBE: "adobe.com",
  INTC: "intel.com",
  QCOM: "qualcomm.com",
  TXN: "ti.com",
  BAC: "bankofamerica.com",
  DIS: "disney.com",
  CSCO: "cisco.com",
};

export function usLogoDomain(symbol: string): string | null {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;
  const direct = US_LOGO_DOMAIN[sym];
  if (direct) return direct;
  if (sym.includes("-")) {
    const dotted = US_LOGO_DOMAIN[sym.replace("-", ".")];
    if (dotted) return dotted;
  }
  return null;
}
