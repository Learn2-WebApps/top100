import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin uses native Node.js modules — must run in Node.js runtime, not Edge
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
