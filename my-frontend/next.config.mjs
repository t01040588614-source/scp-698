/** @type {import('next').NextConfig} */
const backendOrigin =
  process.env.STOCK_API_PROXY?.replace(/\/$/, "") || "http://127.0.0.1:8000";

const nextConfig = {
  output: "standalone",
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
