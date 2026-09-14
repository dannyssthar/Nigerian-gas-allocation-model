import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // In development the Python engine runs separately on :8000.
    // On Vercel the /api/* paths are served by the Python function, so this
    // rewrite is a no-op there.
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" }]
      : [];
  },
};

export default nextConfig;