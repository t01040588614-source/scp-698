/** 한국: 네이버 PNG + 백엔드 프록시 / 미국: FMP + 프록시 */

import { intlYahooLogoTicker } from "@/data/intlLogoTickers";
import { usLogoDomain } from "@/data/usLogoDomains";
import { getApiBaseUrl } from "@/lib/apiBase";
import { inferStockMarket } from "@/lib/inferStockMarket";

const LOGO_PROXY_VERSION = "5";

const FNGUIDE_KR = "https://comp.fnguide.com/Mobile/Common/Data/logo/KR/{code}.png";
const FINNHUB_LOGO =
  "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/{ticker}.png";
const PARQET_LOGO = "https://assets.parqet.com/logos/symbol/{ticker}?format=png";
const CLEARBIT_LOGO = "https://logo.clearbit.com/{domain}";

export function normalizeKoreaCode(symbol: string): string | null {
  const raw = symbol.trim().replace(/\.(KS|KQ)$/i, "");
  const digits = raw.replace(/\D/g, "");
  return digits.length === 6 ? digits : null;
}

export function resolveLogoMarket(market: "korea" | "us", symbol: string): "korea" | "us" {
  return inferStockMarket(symbol) === "korea" ? "korea" : market;
}

/** 지수·뉴스 등 비종목 코드는 로고 요청하지 않음 */
export function canShowStockLogo(symbol: string): boolean {
  const sym = symbol.trim();
  if (!sym) return false;
  if (normalizeKoreaCode(sym)) return true;
  return /^[A-Z0-9.-]{1,12}$/i.test(sym);
}

const NAVER_KR_LOGO =
  "https://ssl.pstatic.net/imgstock/fn/real/logo/png/stock/Stock{code}.png";

/** Yahoo/FMP 클래스주 (BRK-B → BRK.B 우선) */
export function usFmpTickers(symbol: string): string[] {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return [];
  const ordered: string[] = [];
  const add = (ticker: string) => {
    if (!ticker || !/^[A-Z0-9.-]{1,12}$/.test(ticker)) return;
    if (!ordered.includes(ticker)) ordered.push(ticker);
  };
  if (/^[A-Z0-9]{1,8}-[A-Z0-9]{1,3}$/.test(sym)) {
    add(sym.replace("-", "."));
  }
  add(sym);
  if (sym.includes(".")) {
    add(sym.split(".")[0] ?? sym);
  } else if (sym.includes("-")) {
    add(sym.split("-")[0] ?? sym);
  }
  return ordered;
}

function usLogoTickers(symbol: string): string[] {
  const sym = symbol.trim().toUpperCase();
  const ordered: string[] = [];
  const add = (ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t || !/^[A-Z0-9.-]{1,12}$/.test(t)) return;
    if (!ordered.includes(t)) ordered.push(t);
  };
  const mapped = intlYahooLogoTicker(sym);
  if (mapped) add(mapped);
  if (sym.includes(".")) add(sym);
  for (const t of usFmpTickers(sym)) add(t);
  return ordered;
}

function urlsForTickers(tickers: string[], clearbitSymbol?: string): string[] {
  const urls: string[] = [];
  for (const ticker of tickers) {
    const enc = encodeURIComponent(ticker);
    // Finnhub·Parqet가 FMP placeholder보다 브라우저에서 안정적인 경우가 많음
    urls.push(FINNHUB_LOGO.replace("{ticker}", enc));
    urls.push(PARQET_LOGO.replace("{ticker}", enc));
    urls.push(`https://financialmodelingprep.com/image-stock/${enc}.png`);
  }
  if (clearbitSymbol) {
    const domain = usLogoDomain(clearbitSymbol);
    if (domain) {
      urls.push(CLEARBIT_LOGO.replace("{domain}", domain));
    }
  }
  return urls;
}

function directKoreaLogoUrls(code: string): string[] {
  return [
    NAVER_KR_LOGO.replace("{code}", code),
    FNGUIDE_KR.replace("{code}", code),
    ...urlsForTickers([`${code}.KS`, `${code}.KQ`]),
  ];
}

function directUsLogoUrls(ticker: string): string[] {
  return urlsForTickers(usLogoTickers(ticker), ticker);
}

/** API 프록시 URL (우선) — v= 쿼리로 구버전 FMP 캐시 무효화 */
export function getStockLogoProxyUrl(market: "korea" | "us", symbol: string): string | null {
  const effective = resolveLogoMarket(market, symbol);
  const sym = symbol.trim();
  if (!sym || !canShowStockLogo(sym)) return null;
  const base = getApiBaseUrl();
  const v = `v=${LOGO_PROXY_VERSION}`;
  if (effective === "korea") {
    const code = normalizeKoreaCode(sym);
    if (!code) return null;
    return `${base}/market/stock-logo/korea/${encodeURIComponent(code)}?${v}`;
  }
  const ticker = sym.toUpperCase();
  return `${base}/market/stock-logo/us/${encodeURIComponent(ticker)}?${v}`;
}

/** 프록시 실패 시 직접 URL 순차 시도 */
export function getStockLogoCandidates(market: "korea" | "us", symbol: string): string[] {
  const sym = symbol.trim();
  if (!sym || !canShowStockLogo(sym)) return [];

  const effective = resolveLogoMarket(market, sym);
  const proxy = getStockLogoProxyUrl(market, sym);
  let direct: string[] = [];
  if (effective === "korea") {
    const code = normalizeKoreaCode(sym);
    if (code) direct = directKoreaLogoUrls(code);
  } else {
    direct = directUsLogoUrls(sym);
  }

  // 한국: 네이버 CDN이 브라우저에서 잘 됨 → 직접 URL 우선
  // 미국: FMP 등 해외 CDN 차단·핫링크 이슈 → 백엔드 프록시 우선
  let ordered: string[];
  if (effective === "us" && proxy) {
    ordered = [proxy, ...direct];
  } else if (proxy) {
    ordered = [...direct, proxy];
  } else {
    ordered = direct;
  }
  return Array.from(new Set(ordered));
}

export function getStockLogoUrl(market: "korea" | "us", symbol: string): string | null {
  const candidates = getStockLogoCandidates(market, symbol);
  return candidates[0] ?? null;
}
