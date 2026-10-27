import { indexMarketsHref } from "@/lib/indexStrip";

export type IndexMembershipLink = {
  id: string;
  name: string;
  href: string;
  note?: string;
};

/** 종목 상장 시장·거래소 기준 관련 지수 (전체 구성종목 목록은 KRX/지수사 API 별도) */
export function resolveEquityIndexMembership(
  market: "korea" | "us",
  opts: { exchange?: string; board?: "KOSPI" | "KOSDAQ" },
): IndexMembershipLink[] {
  if (market === "korea") {
    const board = opts.board ?? "KOSPI";
    const primaryId = board === "KOSDAQ" ? "kosdaq" : "kospi";
    const links: IndexMembershipLink[] = [
      {
        id: primaryId,
        name: board === "KOSDAQ" ? "코스닥" : "코스피",
        href: indexMarketsHref(primaryId),
        note: `${board} 상장`,
      },
    ];
    if (board === "KOSPI") {
      links.push({
        id: "kospi200",
        name: "코스피200",
        href: indexMarketsHref("kospi200"),
        note: "대형주 지수 (구성은 시가총액·유동성 기준)",
      });
    }
    return links;
  }

  const ex = (opts.exchange ?? "").toUpperCase();
  const links: IndexMembershipLink[] = [];
  if (ex.includes("NASDAQ") || ex === "NMS" || ex === "NGM") {
    links.push({
      id: "nasdaq",
      name: "NASDAQ Composite",
      href: indexMarketsHref("nasdaq"),
      note: "NASDAQ 상장",
    });
    links.push({
      id: "us-tech100",
      name: "US Tech 100",
      href: indexMarketsHref("us-tech100"),
      note: "기술주 중심 (참고)",
    });
  }
  if (ex.includes("NYSE") || ex.includes("NYQ") || ex.includes("NYS")) {
    links.push({
      id: "sp500",
      name: "S&P 500",
      href: indexMarketsHref("sp500"),
      note: "NYSE 대형주 (S&P 편입 여부는 별도)",
    });
    links.push({
      id: "dow",
      name: "Dow Jones",
      href: indexMarketsHref("dow"),
      note: "참고 지수",
    });
  }
  if (links.length === 0) {
    links.push(
      {
        id: "nasdaq",
        name: "NASDAQ",
        href: indexMarketsHref("nasdaq"),
        note: "미국 기술·성장주",
      },
      {
        id: "sp500",
        name: "S&P 500",
        href: indexMarketsHref("sp500"),
        note: "미국 대형주",
      },
    );
  }
  return links;
}
