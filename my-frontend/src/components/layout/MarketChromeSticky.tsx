type MarketChromeStickyProps = {
  children: React.ReactNode;
  /** 한국/미국/종목 — 하위 탭·안내 바 포함 */
  extended?: boolean;
  /** 시장 티커 레일 포함 — scroll-padding 변수 선택 */
  withTicker?: boolean;
};

/** 시장 상태·빠른 이동·(선택) 티커 — 페이지와 함께 스크롤 */
export default function MarketChromeSticky({
  children,
  extended = false,
  withTicker = false,
}: MarketChromeStickyProps) {
  return (
    <div
      className={[
        "app-market-chrome-sticky",
        extended && "app-market-chrome-sticky--extended",
        withTicker && "app-market-chrome-sticky--with-ticker",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
