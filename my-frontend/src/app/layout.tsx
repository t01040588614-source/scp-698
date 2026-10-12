import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/queryClient";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import AppShell from "@/components/layout/AppShell";
import { CRITICAL_LAYOUT_CSS } from "@/lib/criticalStyles";

export const metadata: Metadata = {
  title: {
    default: "MarketLens — KR · US Real-time Markets",
    template: "%s",
  },
  description:
    "시장 데이터, 금융 뉴스, 차트, 경제 캘린더, 관심목록을 웹과 모바일에서 확인하세요.",
  metadataBase: new URL("https://example.com"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

const themeInitScript = `(function(){try{var flag='investing-ui-20260929';if(!localStorage.getItem(flag)){localStorage.setItem('stock-dashboard-theme','light');localStorage.setItem(flag,'1');}var k='stock-dashboard-theme';var m=localStorage.getItem(k);var t=m==='dark'?'dark':'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <style id="critical-layout" dangerouslySetInnerHTML={{ __html: CRITICAL_LAYOUT_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ReactQueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
