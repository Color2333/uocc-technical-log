import type { NextConfig } from "next";

// output: "export" is required for static site generation (npm run build),
// but must be disabled in dev mode — otherwise Next.js routes unrecognised
// paths (e.g. /sw.js, favicons) through the [locale] dynamic segment,
// triggering generateStaticParams errors and 500 responses.
const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
