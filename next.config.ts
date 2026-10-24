import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Azure App Service standalone zip deploy workflow.
  output: "standalone",
  images: {
    // Gallery uses next/image quality={50} against compressedimages (.webp).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.blob.core.windows.net",
        pathname: "/compressedimages/**",
      },
    ],
  },
};

export default nextConfig;
