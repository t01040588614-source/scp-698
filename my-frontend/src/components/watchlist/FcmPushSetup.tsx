"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { userDataApi } from "@/lib/userDataApi";
import { fetchFirebasePublicConfig, registerWebFcmToken } from "@/lib/firebaseMessaging";
import { integrationsApi } from "@/services/integrationsApi";

export default function FcmPushSetup() {
  const { isAuthenticated } = useAuth();
  const [token, setToken] = useState("");
  const [note, setNote] = useState("");
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  const firebaseCfg = useQuery({
    queryKey: ["firebasePublicConfig"],
    queryFn: fetchFirebasePublicConfig,
    staleTime: 60_000,
  });

  const deviceCount = useQuery({
    queryKey: ["fcmDeviceCount"],
    queryFn: () => userDataApi.getFcmDeviceCount(),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (typeof Notification === "undefined") setPerm("unsupported");
    else setPerm(Notification.permission);
  }, []);

  const save = useMutation({
    mutationFn: () => userDataApi.registerFcmToken(token.trim()),
    onSuccess: () => {
      setNote("FCM 디바이스 토큰을 서버에 저장했습니다.");
      void deviceCount.refetch();
    },
    onError: (e: Error) => setNote(e.message),
  });

  const autoWeb = useMutation({
    mutationFn: async () => {
      const webToken = await registerWebFcmToken();
      setToken(webToken);
      await userDataApi.registerFcmToken(webToken);
      return webToken;
    },
    onSuccess: () => {
      setNote("웹 FCM 토큰을 발급·저장했습니다. 탭을 닫아도 서버 푸시를 시도합니다.");
      void deviceCount.refetch();
    },
    onError: (e: Error) => setNote(e.message),
  });

  const test = useMutation({
    mutationFn: () =>
      integrationsApi.testFcm(token.trim(), "MarketLens", "가격 알림 테스트 — 연동 OK"),
    onSuccess: () => setNote("FCM 테스트 푸시를 요청했습니다."),
    onError: (e: Error) => setNote(e.message),
  });

  if (!isAuthenticated) {
    return (
      <p className="text-muted-sm">
        로그인하면 FCM 토큰을 계정에 저장해, 탭을 닫아도 서버 가격 알림 푸시를 받을 수 있습니다.
      </p>
    );
  }

  const askBrowser = () => {
    if (typeof Notification === "undefined") {
      setPerm("unsupported");
      setNote("이 브라우저는 Notification API를 지원하지 않습니다.");
      return;
    }
    void Notification.requestPermission().then((p) => {
      setPerm(p);
      setNote(
        p === "granted"
          ? "브라우저 알림 권한 허용됨 (PriceAlertMonitor와 함께 동작)"
          : "브라우저 알림이 거부되었습니다."
      );
    });
  };

  const firebaseReady = Boolean(firebaseCfg.data?.vapidKey);

  return (
    <article className="panel p-4 space-y-3 price-alerts-fcm">
      <h3 className="font-semibold text-sm">푸시 알림 (FCM)</h3>
      <p className="text-muted-sm text-sm">
        서버 <code className="text-xs">FCM_SERVER_KEY</code> + 아래 토큰 저장 시, 가격 알림 워커가
        푸시를 보냅니다. Firebase Web 설정이 있으면 <strong>웹 자동 등록</strong>을 사용하세요.
      </p>
      {deviceCount.data ? (
        <p className="text-muted-sm text-sm tabular">등록된 기기: {deviceCount.data.count}대</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="inv-btn inv-btn--ghost text-sm" onClick={askBrowser}>
          브라우저 알림 권한
        </button>
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={!firebaseReady || autoWeb.isPending}
          onClick={() => autoWeb.mutate()}
          title={firebaseReady ? undefined : "FIREBASE_* 환경 변수 필요"}
        >
          {autoWeb.isPending ? "등록 중…" : "웹 FCM 자동 등록"}
        </button>
        <span className="text-muted-sm text-sm tabular">
          권한: {perm === "unsupported" ? "미지원" : perm}
          {firebaseReady ? " · Firebase OK" : " · Firebase 미설정"}
        </span>
      </div>
      <label className="block text-sm">
        <span className="form-label">FCM 디바이스 토큰 (수동 붙여넣기)</span>
        <textarea
          className="form-input-plain w-full mt-1 min-h-[4rem] font-mono text-xs"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="모바일 앱 또는 웹 자동 등록 후 표시되는 토큰"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={!token.trim() || save.isPending}
          onClick={() => save.mutate()}
        >
          서버에 저장
        </button>
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={!token.trim() || test.isPending}
          onClick={() => test.mutate()}
        >
          테스트 푸시
        </button>
      </div>
      {note ? <p className="text-sm">{note}</p> : null}
    </article>
  );
}
