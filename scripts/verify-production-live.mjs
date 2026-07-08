#!/usr/bin/env node
/**
 * Smoke-test that the Vercel production URL serves the expected git commit.
 * Used by .github/workflows/verify-production.yml after each push to master.
 */
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? "https://amazon-label-cropper.vercel.app";
const EXPECTED_SHA = process.env.EXPECTED_SHA ?? process.env.GITHUB_SHA;

if (!EXPECTED_SHA) {
  console.error("Missing EXPECTED_SHA or GITHUB_SHA");
  process.exit(1);
}

const shortSha = EXPECTED_SHA.slice(0, 7);
const paths = ["/", "/crop/"];

for (const path of paths) {
  const url = `${PRODUCTION_URL.replace(/\/$/, "")}${path}`;
  const response = await fetch(url, {
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    redirect: "follow",
  });

  if (!response.ok) {
    console.error(`FAIL ${url} → HTTP ${response.status}`);
    process.exit(1);
  }

  const html = await response.text();
  const match = html.match(/name="labelcrop-build"\s+content="([^"]+)"/);
  const liveSha = match?.[1] ?? "";

  if (!liveSha) {
    console.error(`FAIL ${url} → missing labelcrop-build meta tag`);
    process.exit(1);
  }

  if (liveSha !== EXPECTED_SHA && !liveSha.startsWith(shortSha)) {
    console.error(
      `FAIL ${url} → live build ${liveSha} does not match expected ${EXPECTED_SHA}`,
    );
    process.exit(1);
  }

  console.log(`OK ${url} → build ${liveSha}`);
}

console.log("Production smoke test passed.");
