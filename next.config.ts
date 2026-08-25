import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@hugeicons/react", "@hugeicons/core-free-icons"],
  },
  serverExternalPackages: ["pptxgenjs", "potrace", "jimp", "sharp"],
  typescript: {
    // Dokploy's small build host runs out of memory during Next's duplicate
    // checker. Local/CI builds keep this disabled and remain the type gate.
    ignoreBuildErrors: process.env.SKIP_NEXT_TYPECHECK === "1",
  },
};

export default nextConfig;
