"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f3f3f3", color: "#232526" }}>
        <div style={{ padding: 48, maxWidth: 560, margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>MarketLens — Server Error</h1>
          <p style={{ lineHeight: 1.55, color: "#444b54" }}>
            앱을 시작하지 못했습니다. <strong>stop-dev.bat</strong> 실행 후{" "}
            <strong>주식대시보드_통합.bat</strong>(메뉴 1)으로 다시 시작해 주세요.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid #e6e9ef",
              borderRadius: 4,
              background: "#fff",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
