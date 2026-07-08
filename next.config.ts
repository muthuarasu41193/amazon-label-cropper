import type { NextConfig } from "next";
import path from "path";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const isVercel = process.env.VERCEL === "1";
const basePath = isGithubPages ? "/amazon-label-cropper" : "";

// Hard guard: Vercel must never run with the GitHub Pages subpath/static-export mode.
if (isVercel && isGithubPages) {
  throw new Error(
    "Invalid build env: do not set GITHUB_PAGES=true on Vercel. " +
      "Vercel serves at the domain root with the native Next.js runtime.",
  );
}

const nextConfig: NextConfig = {
  // Native Next.js on Vercel. Static export only for GitHub Pages / Cloudflare.
  ...(isVercel ? {} : { output: "export" as const }),
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
