import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Dev only: lets the dev server's scripts load when the app is opened by this machine's
  // network address instead of localhost. Without it the page never hydrates and forms do nothing.
  allowedDevOrigins: ["192.20.120.10"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
