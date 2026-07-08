#!/usr/bin/env node
/**
 * Guardrails for Vercel deployments.
 * Fails fast if config would serve the legacy static site or static-export `out/`.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(relPath) {
  const full = resolve(root, relPath);
  if (!existsSync(full)) {
    fail(`Missing required file: ${relPath}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(full, "utf8"));
  } catch (error) {
    fail(`Invalid JSON in ${relPath}: ${error.message}`);
    return null;
  }
}

const vercel = readJson("vercel.json");
if (vercel) {
  if (vercel.framework !== "nextjs") {
    fail('vercel.json must set "framework": "nextjs" so Vercel never falls back to Other/static root.');
  }
  if (Object.prototype.hasOwnProperty.call(vercel, "outputDirectory")) {
    fail(
      'vercel.json must NOT set "outputDirectory". For Next.js on Vercel, leave it unset so the native runtime is used (never "out" or ".").',
    );
  }
  if (vercel.buildCommand && !String(vercel.buildCommand).includes("build")) {
    fail('vercel.json "buildCommand" should run the Next.js build (npm run build).');
  }
}

const ignorePath = resolve(root, ".vercelignore");
if (!existsSync(ignorePath)) {
  fail("Missing .vercelignore — legacy HTML can be uploaded and override Next.js routes.");
} else {
  const ignore = readFileSync(ignorePath, "utf8");
  for (const required of ["index.html", "cropper.html", "crop.html", "js/", "css/"]) {
    if (!ignore.split(/\r?\n/).some((line) => line.trim() === required)) {
      fail(`.vercelignore must exclude legacy path: ${required}`);
    }
  }
}

const nextConfigPath = resolve(root, "next.config.ts");
if (!existsSync(nextConfigPath)) {
  fail("Missing next.config.ts");
} else {
  const nextConfig = readFileSync(nextConfigPath, "utf8");
  if (!nextConfig.includes("VERCEL")) {
    fail("next.config.ts must detect VERCEL and avoid static export on Vercel.");
  }
  if (!nextConfig.includes('output: "export"') && !nextConfig.includes("output: 'export'")) {
    fail('next.config.ts should keep static export only for non-Vercel hosts (GitHub Pages).');
  }
  if (!nextConfig.includes("GITHUB_PAGES") || !nextConfig.includes("throw new Error")) {
    fail("next.config.ts should refuse GITHUB_PAGES=true when VERCEL=1.");
  }
}

const forbiddenEnvHints = ["GITHUB_PAGES=true"];
for (const hint of forbiddenEnvHints) {
  if (process.env.VERCEL === "1" && process.env.GITHUB_PAGES === "true") {
    fail(`Do not set ${hint} on Vercel builds.`);
  }
}

if (errors.length) {
  console.error("Vercel deploy guard failed:\n");
  for (const error of errors) console.error(`  • ${error}`);
  console.error("\nSee DEPLOY.md → Vercel section.");
  process.exit(1);
}

console.log("Vercel deploy guard passed.");
