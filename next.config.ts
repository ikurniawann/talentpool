import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ['192.168.18.29', 'localhost'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
