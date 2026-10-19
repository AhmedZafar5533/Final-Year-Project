import type { NextConfig } from "next";

/**
 * The desktop build ships static files inside the Tauri bundle, so it needs
 * `output: "export"`. That is incompatible with Next's experimental PPR/cache
 * components, which the browser build keeps. The Tauri build command sets
 * TAURI_BUILD=1.
 */
const isTauriBuild = process.env.TAURI_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isTauriBuild
    ? { output: "export" as const, images: { unoptimized: true } }
    : { cacheComponents: true, partialPrefetching: true }),
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
