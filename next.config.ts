import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mumbai — keep in sync with vercel.json regions and Supabase ap-south-1.
  experimental: {
    // Client soft-nav cache (helps Vercel + local): reuse RSC payload briefly.
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
