import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
function normalizeBackendOrigin(raw) {
  const trimmed = (raw || "").replace(/\/$/, "");
  if (!trimmed) return "http://127.0.0.1:8000";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
const backendOrigin = normalizeBackendOrigin(process.env.STOCK_API_PROXY);

const lwcProduction = path.join(
  __dirname,
  "node_modules/lightweight-charts/dist/lightweight-charts.production.mjs"
);

const nextConfig = {
  output: "standalone",
  transpilePackages: ["lightweight-charts"],
  webpack(config, { isServer, dev }) {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "lightweight-charts": lwcProduction,
      };
    }
    /* 한글 경로·Windows에서 HMR 누락 방지 — dev 저장 시 CSS/TS 즉시 반영 */
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules/**"],
      };
    }
    return config;
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async redirects() {
    return [
      {
        source: "/stocks/:code/chart",
        destination: "/charts?market=korea&symbol=:code",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      // 주식대시 API
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
      // DOCX 명세: NEXT /api/stocks → FastAPI /api/v1/stocks
      {
        source: "/api/stocks/:path*",
        destination: `${backendOrigin}/api/v1/stocks/:path*`,
      },
      {
        source: "/api/stocks",
        destination: `${backendOrigin}/api/v1/stocks`,
      },
      {
        source: "/api/accounts/:path*",
        destination: `${backendOrigin}/api/v1/accounts/:path*`,
      },
      {
        source: "/api/accounts",
        destination: `${backendOrigin}/api/v1/accounts`,
      },
    ];
  },
};

export default nextConfig;
