import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run build:check` builds into .next-build so it can run while `npm run dev` is using .next.
  // (Two builds writing to the same folder corrupt the dev server.)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Hide the floating dev badge so it doesn't show up in demos and screenshots.
  devIndicators: false,
};

export default nextConfig;
