"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { integrationsApi } from "@/services/integrationsApi";

export default function FcmTestBlock({ active }: { active: boolean }) {
  const [token, setToken] = useState("");
  const [note, setNote] = useState("");

  const testMutation = useMutation({
    mutationFn: () =>
      integrationsApi.testFcm(token, "MarketLens", "API 키 연동 페이지에서 보낸 테스트 알림입니다."),
    onSuccess: () => setNote("FCM 테스트 요청 성공"),
    onError: (err: Error) => setNote(err.message || "실패"),
  });

  if (!active) return null;

  return (
    <article className="inv-investing-panel panel p-5 space-y-3 lg:col-span-2">
      <h3 className="font-semibold">FCM 테스트 푸시</h3>
      <p className="text-muted-sm">
        Legacy Server Key(<code className="text-xs">FCM_SERVER_KEY</code>)가 설정된 상태에서 디바이스
        토큰으로 알림을 보냅니다.
      </p>
      <textarea
        className="form-input-plain w-full min-h-[4rem] font-mono text-xs"
        placeholder="FCM registration token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <button
        type="button"
        className="btn-secondary"
        disabled={testMutation.isPending || token.trim().length < 10}
        onClick={() => testMutation.mutate()}
      >
        테스트 푸시
      </button>
      {note ? <p className="text-sm">{note}</p> : null}
    </article>
  );
}
