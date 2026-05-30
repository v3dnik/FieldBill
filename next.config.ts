import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['pdfkit', 'swissqrbill', 'firebase-admin'],
};

export default nextConfig;