import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack désactivé via --webpack dans dev-debug.js (crash 0xC0000005 sur Windows/OneDrive)
};

export default nextConfig;
