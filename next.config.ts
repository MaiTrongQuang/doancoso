import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "qr.sepay.vn",
        pathname: "/img",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
