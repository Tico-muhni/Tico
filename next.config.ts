import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Post-import uploads send one image per request. Vercel caps a function
      // request body at 4.5MB, so stay just under it.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
