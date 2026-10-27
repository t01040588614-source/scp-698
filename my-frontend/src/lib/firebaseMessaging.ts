import { getApiBaseUrl } from "@/lib/apiBase";

export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
};

export async function fetchFirebasePublicConfig(): Promise<FirebasePublicConfig | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/config/firebase-public`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as FirebasePublicConfig;
  } catch {
    return null;
  }
}

export async function registerWebFcmToken(): Promise<string> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Service Worker를 지원하지 않는 환경입니다.");
  }
  const config = await fetchFirebasePublicConfig();
  if (!config?.vapidKey) {
    throw new Error(
      "Firebase Web Push가 설정되지 않았습니다. stock-backend .env에 FIREBASE_* 값을 넣어 주세요."
    );
  }
  if (typeof Notification !== "undefined") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      throw new Error("브라우저 알림 권한이 필요합니다.");
    }
  }
  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  reg.active?.postMessage({ type: "INIT_FCM" });
  await new Promise((r) => setTimeout(r, 400));

  const { initializeApp } = await import("firebase/app");
  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");

  if (!(await isSupported())) {
    throw new Error("이 브라우저는 Firebase Messaging을 지원하지 않습니다.");
  }

  const app = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: config.vapidKey,
    serviceWorkerRegistration: reg,
  });
  if (!token) {
    throw new Error("FCM 토큰을 발급하지 못했습니다.");
  }
  return token;
}
