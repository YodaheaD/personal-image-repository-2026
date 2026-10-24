import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Gallery uses <img> for arbitrary blob URLs; remotePatterns unused for now.
    unoptimized: true,
  },
};

export default nextConfig;
