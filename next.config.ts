import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep recently visited dynamic routes warm so sidebar clicks feel instant.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
