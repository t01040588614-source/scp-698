"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DesktopHeader from "./DesktopHeader";
import MobileHeader from "./MobileHeader";
import PrimaryNavigation from "./PrimaryNavigation";
import BottomNavigation from "./BottomNavigation";
import MarketTicker from "@/components/market/MarketTicker";
import MarketStatusBar from "@/components/market/MarketStatusBar";
import MarketSessionMobileStrip from "@/components/market/MarketSessionMobileStrip";
import MarketSubNavigation from "@/components/layout/MarketSubNavigation";
import MarketChromeSticky from "@/components/layout/MarketChromeSticky";
import AppHighlightBar from "@/components/layout/AppHighlightBar";
import SiteFooter from "@/components/layout/SiteFooter";
import { MarketWebSocketProvider } from "@/context/MarketWebSocketProvider";
import GlobalMarketStreamBoot from "@/components/market/GlobalMarketStreamBoot";
import WsOfflineBanner from "@/components/layout/WsOfflineBanner";
import YahooAutoThrottleSync from "@/components/layout/YahooAutoThrottleSync";
import PriceAlertMonitor from "@/components/watchlist/PriceAlertMonitor";
import { useMarketCacheWarmup } from "@/hooks/useMarketCacheWarmup";
import { QuoteRefreshSettingsProvider } from "@/context/QuoteRefreshSettingsContext";
import LiveStockQuerySync from "@/components/market/LiveStockQuerySync";
import MarketAiChatWidget from "@/components/chat/MarketAiChatWidget";

function MarketCacheWarmupBoot() {
  useMarketCacheWarmup();
  return null;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const hideTicker =
    pathname === "/korea" ||
    pathname === "/us" ||
    pathname === "/charts" ||
    pathname.startsWith("/quote/");

  const showMarketSubnav =
    pathname === "/korea" || pathname === "/us" || pathname.startsWith("/quote/");

  const isAuthPage =
    pathname === "/register" ||
    pathname === "/login" ||
    pathname.startsWith("/login/");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <MarketWebSocketProvider>
      <QuoteRefreshSettingsProvider>
        <YahooAutoThrottleSync />
        <MarketCacheWarmupBoot />
        <LiveStockQuerySync />
        <GlobalMarketStreamBoot />
        {!isAuthPage && <WsOfflineBanner />}
        {!isAuthPage && <PriceAlertMonitor />}
        {!isAuthPage && <DesktopHeader />}
        {!isAuthPage && (
          <MobileHeader
            isMenuOpen={menuOpen}
            onMenuToggle={() => setMenuOpen((v) => !v)}
            onMenuClose={() => setMenuOpen(false)}
          />
        )}
        {!isAuthPage && <PrimaryNavigation />}
        {!isAuthPage && (
          <MarketChromeSticky extended={showMarketSubnav} withTicker={!hideTicker}>
            <MarketStatusBar showQuickLinks={!showMarketSubnav} />
            {showMarketSubnav && <AppHighlightBar />}
            {showMarketSubnav && <MarketSubNavigation />}
            <MarketSessionMobileStrip />
            {!hideTicker && (
              <div className="market-ticker-bleed">
                <div className="container market-ticker-wrap">
                  <MarketTicker />
                </div>
              </div>
            )}
          </MarketChromeSticky>
        )}
        <main className={`app-main min-h-screen${isAuthPage ? " app-main--auth" : ""}`}>{children}</main>
        {!isAuthPage && <SiteFooter />}
        {!isAuthPage && <BottomNavigation />}
        {!isAuthPage && (
          <Suspense fallback={null}>
            <MarketAiChatWidget />
          </Suspense>
        )}
      </QuoteRefreshSettingsProvider>
    </MarketWebSocketProvider>
  );
}
