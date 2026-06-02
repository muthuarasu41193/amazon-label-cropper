# LabelForge — Ecommerce Label Suite

A premium, browser-only toolkit for Indian ecommerce sellers. Crop multi-label shipping PDFs into **one thermal label per page** for Amazon, Flipkart, Meesho, and 10+ more platforms.

## Features

- **14+ marketplace & logistics croppers** with tuned default settings per platform
- **4×6 thermal** output, fit modes, margin trim, blank-label skip
- **Product name + quantity** pulled from invoice column (where supported)
- **100% client-side** — no server, no account, no upload

## Live hosting (Cloudflare Pages)

This project is meant for **Cloudflare Pages** with GitHub connected (no build step). See **[DEPLOY-CLOUDFLARE.md](./DEPLOY-CLOUDFLARE.md)** for dashboard settings, custom domains, and cache troubleshooting.

**Canonical URLs** (replace with your `*.pages.dev` or custom domain):

- Hub: `https://<your-domain>/`
- Amazon: `https://<your-domain>/cropper.html?p=amazon`

GitHub Pages (`*.github.io/amazon-label-cropper`) also works but use **one** host only to avoid confusion and stale cache.

## Run locally

```bash
cd amazon-label-cropper
python -m http.server 5501
```

Open [http://127.0.0.1:5501](http://127.0.0.1:5501) for the hub, or go directly to a cropper:

- [Amazon](http://127.0.0.1:5501/cropper.html?p=amazon)
- [Flipkart](http://127.0.0.1:5501/cropper.html?p=flipkart)
- [Meesho](http://127.0.0.1:5501/cropper.html?p=meesho)

## Project structure

```
index.html          Hub — pick a platform
cropper.html?p=…    Workbench for one platform
js/platforms.js     Platform presets & roadmap tools
js/crop-engine.js   PDF crop logic
js/cropper-app.js   Cropper UI
js/hub.js           Hub rendering
css/                Premium design system
```

## Adding a platform

Edit `js/platforms.js` — add an entry to `PLATFORMS` with `defaults` (layout, widths, invoice text). The hub and cropper pick it up automatically.

## Legacy note

The original single-page Amazon cropper (`app.js` / old `index.html`) has been replaced by this suite. Use `cropper.html?p=amazon` for the same workflow with the new UI.
