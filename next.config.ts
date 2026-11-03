import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Booking-screenshot uploads (src/components/ScreenshotUploadPanel.tsx)
      // send base64-encoded images through a Server Action — the default
      // 1MB body limit is too small for even a single phone screenshot
      // once base64-inflated, let alone a few of them in one submission.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
