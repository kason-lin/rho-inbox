import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run build:check` builds into .next-build so it can run while `npm run dev` is using .next.
  // (Two builds writing to the same folder corrupt the dev server.)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Hide the floating dev badge so it doesn't show up in demos and screenshots.
  devIndicators: false,
  // Business health replaced the earlier Check-in prototype; old links land on the new screens.
  async redirects() {
    return [
      { source: '/checkin', destination: '/business-health', permanent: false },
      { source: '/checkin/:id*', destination: '/business-health', permanent: false },
      { source: '/mail', destination: '/alert', permanent: false },
    ];
  },
};

export default nextConfig;
