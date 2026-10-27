import type { Metadata } from "next";
import QuotePageContent from "@/components/quote/QuotePageContent";
import { getServerApiBaseUrl } from "@/lib/apiBase";
import { createPageMetadata } from "@/lib/seo";

type PageProps = {
  params: { market: string; symbol: string };
};

async function fetchStockName(market: "korea" | "us", symbol: string): Promise<string | null> {
  try {
    const base = getServerApiBaseUrl();
    const res = await fetch(`${base}/stocks/${market}/${encodeURIComponent(symbol)}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string };
    return typeof data.name === "string" && data.name.trim() ? data.name.trim() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const market = params.market === "us" ? "us" : "korea";
  const symbol = params.symbol.toUpperCase();
  const name = await fetchStockName(market, params.symbol);
  const marketLabel = market === "korea" ? "한국" : "미국";
  const title = name ? `${name} (${symbol})` : symbol;

  return createPageMetadata({
    title,
    description: name
      ? `${name} ${marketLabel} 종목 실시간 시세, 차트, 뉴스 — ${symbol}`
      : `${symbol} ${marketLabel} 종목 시세와 차트`,
    path: `/quote/${market}/${params.symbol}`,
  });
}

export default function QuotePage({ params }: PageProps) {
  const market = params.market === "us" ? "us" : "korea";
  return <QuotePageContent market={market} symbol={params.symbol} />;
}
