# Deploy LabelForge on Cloudflare Pages (GitHub)

This repo is a **static site** (HTML + CSS + ES modules). No npm build is required.

## 1. Connect GitHub in Cloudflare

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Choose GitHub and authorize Cloudflare if prompted.
3. Select repository: **`muthuarasu41193/amazon-label-cropper`**.

## 2. Build settings (important)

Use these exactly so Cloudflare does not run a failing Node build:

| Setting | Value |
|--------|--------|
| **Production branch** | `master` |
| **Framework preset** | `None` |
| **Build command** | *(leave empty)* |
| **Build output directory** | `.` or `/` (project root) |
| **Root directory** | *(leave empty)* — only set this if the repo is a monorepo |

If your GitHub repo is the larger `landing` workspace and this app lives in a subfolder, set:

- **Root directory:** `amazon-label-cropper`
- **Build output directory:** `amazon-label-cropper` (or `.` relative to root directory)

Then click **Save and Deploy**.

## 3. Your live URLs

After a successful deploy:

| Page | URL pattern |
|------|-------------|
| **Hub (start here)** | `https://<your-project>.pages.dev/` |
| **Amazon cropper** | `https://<your-project>.pages.dev/cropper.html?p=amazon` |
| **Flipkart** | `https://<your-project>.pages.dev/cropper.html?p=flipkart` |
| **Meesho** | `https://<your-project>.pages.dev/cropper.html?p=meesho` |

Find `<your-project>` under **Workers & Pages** → your project → **Deployments** → visit the production URL.

### Custom domain

1. Project → **Custom domains** → **Set up a custom domain**.
2. Add your domain (e.g. `labels.yourdomain.com`).
3. Cloudflare will create the DNS record if the zone is on the same account.

## 4. Still seeing the old Amazon-only UI?

1. **Purge cache:** Cloudflare zone → **Caching** → **Configuration** → **Purge Everything** (or purge only your Pages hostname).
2. **Hard refresh:** `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac).
3. **Confirm deployment:** Pages → **Deployments** → latest commit should be `Rebrand as LabelForge...` or newer; status **Success**.
4. **Avoid two hosts:** If you still use [GitHub Pages](https://muthuarasu41193.github.io/amazon-label-cropper/), that is a *second* URL. Prefer one canonical host (Cloudflare custom domain) and disable GitHub Pages under repo **Settings → Pages** if you no longer need it.

## 5. Automatic deploys

Every push to `master` triggers a new production deployment. Pull requests can get preview URLs if you enable **Preview deployments** in the project settings.

## 6. Troubleshooting

| Problem | Fix |
|--------|-----|
| Build fails with npm/node errors | Clear **Build command**; preset must be **None**. |
| 404 on `/js/...` | **Build output directory** must be repo root (where `index.html` lives). |
| Blank page / module errors | Open browser DevTools → Console; ensure you are not opening `file://` — use the `pages.dev` or custom domain URL. |
| Old UI after deploy | Purge Cloudflare cache + hard refresh. |

## 7. Optional: deploy from CLI

```bash
npx wrangler pages deploy . --project-name=amazon-label-cropper
```

Git integration is enough for most workflows; CLI is optional.
