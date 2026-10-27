/* MarketLens — Firebase Cloud Messaging (background) */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

let messagingReady = false;

async function ensureMessaging() {
  if (messagingReady) return true;
  const base =
    self.location.origin.includes("localhost") || self.location.origin.includes("127.0.0.1")
      ? "/api/v1/config/firebase-public"
      : "/api/v1/config/firebase-public";
  const res = await fetch(base, { credentials: "same-origin" });
  if (!res.ok) return false;
  const config = await res.json();
  if (!config.apiKey || !config.vapidKey) return false;
  importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");
  firebase.initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "MarketLens";
    const body = payload.notification?.body || "";
    self.registration.showNotification(title, { body, icon: "/icon.svg" });
  });
  messagingReady = true;
  return true;
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "INIT_FCM") {
    void ensureMessaging();
  }
});
