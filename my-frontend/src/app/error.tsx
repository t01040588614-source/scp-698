"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container" style={{ padding: "48px 16px", maxWidth: 560 }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 12 }}>일시적인 오류</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.55 }}>
        페이지를 불러오지 못했습니다. 서버가 아직 준비 중이거나 캐시가 꼬였을 수 있습니다.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button type="button" className="btn-primary" onClick={() => reset()}>
          다시 시도
        </button>
        <a href="/korea" className="btn-secondary" style={{ display: "inline-flex", alignItems: "center" }}>
          한국 시장으로
        </a>
      </div>
      {error.digest ? (
        <p style={{ marginTop: 24, fontSize: 11, color: "var(--text-muted)" }}>오류 ID: {error.digest}</p>
      ) : null}
    </div>
  );
}
