# Deploy LabelForge on Cloudflare (2026 dashboard)

Your GitHub repo was connected via Cloudflare’s **Workers** Git integration (see merged PR `cloudflare/workers-autoconfig` and `wrangler.jsonc`). That is **not** the old standalone “Pages-only” product, so menus like **Settings → Builds & deployments** may not appear.

## Which setup do you have?

| Sign | Meaning |
|------|--------|
| Repo contains `wrangler.jsonc` with `"assets": { "directory": "." }` | **Workers + static assets** (your repo today) |
| Dashboard project type shows **Worker** | Use navigation in **section A** below |
| You created **Pages → Connect to Git** separately | Use **section B** below |

---

## A) Workers + GitHub (your current repo)

### Open the right place in the dashboard

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Left sidebar → **Workers & Pages** (under *Compute* / *Workers & Pages*, depending on account layout)
3. Find the application named **`amazon-label-cropper`** and **click the name** (not “Create application”)

You should land on the **project overview** for that Worker.

### Where things moved (new UI)

Old Pages-only labels → **new location**:

| What you need | Where to click now |
|---------------|-------------------|
| Live site URL | Overview → **Visit** / **Preview** (or the `*.workers.dev` link on the overview card) |
| Build history / success | **Deployments** or **Version history** tab (name varies by account) |
| GitHub repo link | **Settings** → **Builds** (not “Builds & deployments”) |
| Build command & branch | **Settings** → **Builds** → edit build configuration |
| Custom domain | **Settings** → **Domains** or **Custom domains** |
| Environment variables | **Settings** → **Variables** |

If you only see **Metrics**, **Bindings**, **Settings**: open **Settings**, then look for **Builds** in the left sub-menu.

### Build settings for this static site

On **Settings → Builds**:

| Field | Value |
|-------|--------|
| Production branch | `master` |
| Build command | *(often empty or `npx wrangler deploy` — see what Cloudflare set)* |
| Root / working directory | repository root (where `index.html` is) |

This project has **no npm build**. The site is plain HTML/CSS/JS. Configuration lives in **`wrangler.jsonc`**:

```json
"assets": { "directory": "." }
```

That tells Cloudflare to serve `index.html`, `cropper.html`, `css/`, and `js/` from the repo root.

### Your live URLs

After a **successful** deploy, the URL is usually:

```text
https://amazon-label-cropper.<YOUR-SUBDOMAIN>.workers.dev/
```

`<YOUR-SUBDOMAIN>` is assigned by Cloudflare (often related to your account, **not** always your GitHub username).

**Do not assume** `https://amazon-label-cropper.pages.dev` — that only works if you also created a **classic Pages** project with that name.

| Page | Path |
|------|------|
| Hub | `/` |
| Amazon | `/cropper.html?p=amazon` |
| Flipkart | `/cropper.html?p=flipkart` |

Copy the exact URL from the dashboard **Visit** button.

### Still seeing the old Amazon-only UI?

1. **Deployments / Version history** → latest deploy must be commit `f17bf86` or newer (LabelForge rebrand).
2. **Purge cache** (if using a custom domain on Cloudflare): **Caching** → **Purge Everything**.
3. Hard refresh: `Ctrl+Shift+R`.
4. Confirm you are opening the **`workers.dev` URL** from the dashboard, not GitHub Pages:  
   `https://muthuarasu41193.github.io/amazon-label-cropper/` (second host, can look “stuck” on old UI).

### Redeploy from your PC (optional)

```bash
cd amazon-label-cropper
npx wrangler deploy
```

Requires `npx wrangler login` once. This uses `wrangler.jsonc` in the repo.

---

## B) Classic Cloudflare Pages (optional second project)

Only follow this if you explicitly created **Create application → Pages → Connect to Git**.

Then you may see tabs: **Deployments | Custom domains | Settings**, and under Settings → **Builds & deployments**.

| Field | Value |
|-------|--------|
| Framework preset | None |
| Build command | *(empty)* |
| Build output directory | `.` |

Pages URL pattern: `https://<project-name>.pages.dev/`

You do **not** need both a Worker and a Pages project for the same site — pick one to avoid confusion.

---

## Troubleshooting

| Problem | What to do |
|--------|----------------|
| Cannot find “Builds & deployments” | You likely have a **Worker** — use **Settings → Builds**. |
| Build fails | Open the failed deployment log; remove wrong npm/framework build steps. |
| 503 on workers.dev | Deployment failed or not finished — check **Deployments** / build logs. |
| Blank page | Browser DevTools → Console; check `/js/` files return 200. |
| Two different sites | You may have GitHub Pages **and** Cloudflare — use one canonical URL. |

## GitHub repo

https://github.com/muthuarasu41193/amazon-label-cropper
