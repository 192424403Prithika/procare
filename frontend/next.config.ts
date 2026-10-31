import type { NextConfig } from "next";

function resolveBackendUrl(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").trim().replace(/\/+$/, "");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    if (!url.includes(".") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
      url = `https://${url}.onrender.com`;
    } else {
      url = `https://${url}`;
    }
  }
  return url;
}

const backendUrl = resolveBackendUrl();

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
