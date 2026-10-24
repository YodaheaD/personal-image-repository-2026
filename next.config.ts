import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Azure App Service standalone zip deploy workflow.
  output: "standalone",
  images: {
    // Gallery uses <img> for arbitrary blob URLs; remotePatterns unused for now.
    unoptimized: true,
  },
};

export default nextConfig;
