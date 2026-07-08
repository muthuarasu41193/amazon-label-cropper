# Deploy LabelForge (Next.js)

The live site must serve the **Next.js static export** in `out/` — not the legacy `index.html` / `cropper.html` at the repo root.

## GitHub Pages (recommended)

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

Optional: add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to enable `.github/workflows/deploy-cloudflare.yml`.

## Vercel

**URL:** https://amazon-label-cropper.vercel.app

Connected to the GitHub repo — each push to `master` triggers a production deploy.

Manual deploy:

```bash
npx vercel deploy --prod
```

**Important:** Do not set `GITHUB_PAGES=true` on Vercel (site runs at domain root, not a GitHub subpath). Legacy `index.html` / `cropper.html` at the repo root are excluded via `.vercelignore`.

**Note:** Do not use `GITHUB_PAGES=true` for Cloudflare — the Workers URL is at the domain root, not a GitHub subpath.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Legacy static files

`index.html`, `cropper.html`, `js/`, and `css/` at the repo root are **deprecated**. They are kept for reference only and are **not** deployed when GitHub Actions Pages workflow is active.
