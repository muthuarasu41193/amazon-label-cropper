import type { NextConfig } from "next";
import path from "path";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const isVercel = process.env.VERCEL === "1";
const basePath = isGithubPages ? "/amazon-label-cropper" : "";

const nextConfig: NextConfig = {
  // Static export for GitHub Pages & Cloudflare; native Next.js on Vercel.
  ...(isVercel ? {} : { output: "export" as const }),
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
