import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Azure App Service standalone zip deploy workflow.
  output: "standalone",
  images: {
    // Gallery loads Azure compressedimages with next/image `unoptimized` so
    // App Service does not proxy private blobs through /_next/image (409).
    // remotePatterns kept if a future public/SAS path re-enables the optimizer.
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
