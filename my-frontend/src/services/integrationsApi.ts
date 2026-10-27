import axios from "axios";

const api = axios.create({ baseURL: "/api/v1/integrations" });

export type IntegrationField = {
  key: string;
  label: string;
  required: boolean;
  secret: boolean;
  configured: boolean;
  source: string;
  masked: string | null;
};

export type IntegrationItem = {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  configured: boolean;
  active: boolean;
  fields: IntegrationField[];
};

export type IntegrationsResponse = {
  allowUiSave: boolean;
  keysFile: string;
  integrations: IntegrationItem[];
  market: Record<string, unknown>;
};

export type KisVerifyResult = {
  ok: boolean;
  mode: string;
  message: string;
  cashBalance?: number | null;
  accountMasked?: string | null;
};

export const integrationsApi = {
  get: () => api.get<IntegrationsResponse>("").then((r) => r.data),
  verifyKis: (body: {
    appKey: string;
    appSecret: string;
    accountNo?: string;
    accountProductCode?: string;
    useMock?: boolean;
  }) => api.post<KisVerifyResult>("/kis/verify", body).then((r) => r.data),
  saveKeys: (keys: Record<string, string>) =>
    api.put<{ ok: boolean; integrations: IntegrationItem[] }>("/keys", { keys }).then((r) => r.data),
  apply: () => api.post<{ ok: boolean; market: Record<string, unknown> }>("/apply").then((r) => r.data),
  testSms: (phone: string, message?: string) =>
    api
      .post<{ ok: boolean; provider: string; phone: string }>("/sms/test", { phone, message })
      .then((r) => r.data),
  testFcm: (deviceToken: string, title?: string, body?: string) =>
    api
      .post<{ ok: boolean }>("/fcm/test", {
        device_token: deviceToken,
        title: title ?? "MarketLens",
        body: body ?? "FCM 연동 테스트",
      })
      .then((r) => r.data),
};

export type OAuthProvider = { id: string; name: string; loginUrl: string };

export async function fetchOAuthProviders(): Promise<OAuthProvider[]> {
  const res = await axios.get<{ providers: OAuthProvider[] }>("/api/v1/auth/oauth/providers");
  return res.data.providers ?? [];
}
