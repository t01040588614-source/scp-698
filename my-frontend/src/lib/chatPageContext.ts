export type ChatPageContext = {
  symbol?: string;
  market?: string;
  pageLabel?: string;
};

export function parsePageContext(pathname: string | null, search?: string): ChatPageContext {
  if (!pathname) return {};
  const base = pathname.split("?")[0];

  const quote = base.match(/^\/quote\/([^/]+)\/([^/]+)/);
  if (quote) {
    return {
      market: decodeURIComponent(quote[1]),
      symbol: decodeURIComponent(quote[2]),
    };
  }

  const stock = base.match(/^\/stocks\/([^/]+)/);
  if (stock) {
    return { symbol: decodeURIComponent(stock[1]), market: "korea" };
  }

  if (base === "/charts" && search) {
    const params = new URLSearchParams(search);
    const symbol = params.get("symbol") ?? undefined;
    const market = params.get("market") ?? undefined;
    if (symbol) return { symbol, market };
  }

  if (base === "/korea") return { market: "korea", pageLabel: "한국 종목 보드" };
  if (base === "/us") return { market: "us", pageLabel: "미국 종목 보드" };

  return {};
}
