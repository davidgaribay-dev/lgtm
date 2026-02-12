import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    // In dev mode, proxy /storage/* to SeaweedFS so the browser doesn't need
    // direct access to the SeaweedFS port (important for remote dev servers).
    if (process.env.DEPLOYMENT_ENV === "dev" && process.env.S3_ENDPOINT) {
      const bucket = process.env.S3_BUCKET || "lgtm";
      return [
        {
          source: "/storage/:path*",
          destination: `${process.env.S3_ENDPOINT}/${bucket}/:path*`,
        },
      ];
    }
    return [];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
