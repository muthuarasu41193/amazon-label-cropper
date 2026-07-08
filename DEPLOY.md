# Deploy LabelForge (Next.js)

The live site must serve the **Next.js app** — not the legacy `index.html` / `cropper.html` at the repo root.

## Vercel (primary — always live on push)

**Production URL:** https://amazon-label-cropper.vercel.app  
**Custom domain (intended):** https://labelcrop.com

Each push to `master` triggers a Vercel production deploy. GitHub Actions workflow `.github/workflows/verify-production.yml` waits for that deploy and smoke-tests the live URL so stale or failed releases are caught automatically.

### Custom domain: labelcrop.com

`labelcrop.com` must point at Vercel for the public domain to receive updates. If the site shows a parking/lander page instead of LabelCrop, DNS is not configured yet.

**One-time setup:**

1. Vercel → your project → **Settings** → **Domains** → add `labelcrop.com` and `www.labelcrop.com`
2. At your domain registrar (where you bought labelcrop.com), replace parking DNS with:
   - `www` → **CNAME** → `cname.vercel-dns.com`
   - `@` (root) → **A** → `76.76.21.21` (or use your registrar’s apex → Vercel instructions)
3. Wait for DNS propagation (often 5–30 minutes), then confirm in Vercel that both domains show **Valid**

Repo `vercel.json` already lists `labelcrop.com` / `www.labelcrop.com` as aliases so they attach on deploy once DNS is correct.

Until DNS is fixed, use **https://amazon-label-cropper.vercel.app** — that URL always reflects the latest `master` build.

### Required settings (enforced in repo)

| Setting | Value | Why |
|---------|--------|-----|
| Framework | `nextjs` (`vercel.json`) | Prevents "Other"/static root deploy of legacy HTML |
| Build command | `npm run build` | Standard Next.js build |
| Install command | `npm ci` | Reproducible installs |
| Output directory | **unset** | Native Next.js runtime (never `out` or `.`) |
| Env `GITHUB_PAGES` | **must not** be `true` | That mode is only for GitHub Pages subpath + static export |

Legacy files are excluded by `.vercelignore` (`index.html`, `crop.html`, `cropper.html`, `js/`, `css/`).

### Preflight before releasing

```bash
npm run verify
```

This runs typecheck, lint, and `scripts/verify-vercel-build.mjs`, which fails if Vercel config regresses.

GitHub Actions workflow `.github/workflows/ci.yml` also builds with `VERCEL=1` on every push/PR to `master`.

Manual deploy:

```bash
npx vercel deploy --prod
```

### Dashboard checklist (one-time)

In Vercel → Project → Settings → Build & Deployment:

1. Framework Preset: **Next.js** (repo `vercel.json` overrides this if dashboard drifts)
2. Output Directory: leave default / unset (do **not** override to `out`)
3. Root Directory: repository root
4. Do not add `GITHUB_PAGES=true`

## GitHub Pages

**URL:** https://muthuarasu41193.github.io/amazon-label-cropper/

Deployment is handled by `.github/workflows/deploy-github-pages.yml`:

1. Runs `npm ci` and `npm run build` with `GITHUB_PAGES=true` (sets `basePath` for the `/amazon-label-cropper` subpath)
2. Uploads the `out/` folder to GitHub Pages

**One-time setup** (if Pages still shows the old hub):

1. GitHub repo → **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions** (not “Deploy from branch”)

After each push to `master`, the workflow publishes the new Next.js build.

## Cloudflare Workers

**Config:** `wrangler.jsonc` serves `./out` (the Next.js export).

If you use Cloudflare Git integration, set **Settings → Builds**:

| Field | Value |
|-------|--------|
| Production branch | `master` |
| Build command | `npm ci && npm run build && npx wrangler deploy` |
| Root directory | repository root |

Optional Cloudflare deploy is manual only: set repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, then run **Actions → Deploy to Cloudflare Workers → Run workflow**. It does not run on every push (that used to fail with “No jobs were run” when secrets were missing).

**Note:** Do not use `GITHUB_PAGES=true` for Cloudflare — the Workers URL is at the domain root, not a GitHub subpath.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Legacy static files

`index.html`, `cropper.html`, `js/`, and `css/` at the repo root are **deprecated**. They are kept for reference only and are **not** deployed to Vercel (see `.vercelignore`) or when the GitHub Actions Pages workflow is active.
