import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bare-process (PM2) deploys ship only the traced server bundle. Next does not include
  // public/ or .next/static in it — scripts/deploy.sh copies those in beside server.js.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
