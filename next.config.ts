import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // Required for @supabase/ssr
  },
};

export default nextConfig;
