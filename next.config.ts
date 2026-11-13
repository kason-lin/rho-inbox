import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run build:check` builds into .next-build so it can run while `npm run dev` is using .next.
  // (Two builds writing to the same folder corrupt the dev server.)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Hide the floating dev badge so it doesn't show up in demos and screenshots.
  devIndicators: false,
  // Old links land on the new screens.
  async redirects() {
    return [
      // Earlier prototype pages, now folded into Business health.
      ...['/checkin', '/checkin/:id*', '/inbox', '/audit', '/architecture', '/business-health/proof', '/business-health/done', '/business-health/spend']
        .map(source => ({ source, destination: '/business-health', permanent: false })),
      { source: '/business-health/connect', destination: '/settings/connected-tools', permanent: false },
      { source: '/mail', destination: '/alert', permanent: false },
    ];
  },
};

export default nextConfig;
