import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@hugeicons/react", "@hugeicons/core-free-icons"],
  },
  serverExternalPackages: ["pptxgenjs", "potrace", "jimp", "sharp"],
};

export default nextConfig;
