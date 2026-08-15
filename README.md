# LabelForge — Ecommerce Label Suite

A premium, browser-only toolkit for Indian ecommerce sellers. Crop multi-label shipping PDFs into **one thermal label per page**, or build a **dispatch manifest** from Amazon, Meesho, and Flipkart labels.

## Features

- **Label Cropper** — 14+ marketplace & logistics croppers with tuned default settings per platform
- **Manifest Creator** — scan Amazon, Meesho, and Flipkart shipping PDFs into an editable handover sheet (CSV + PDF)
- **4×6 thermal** output, fit modes, margin trim, blank-label skip
- **Product name + quantity** pulled from invoice column (where supported)
- **100% client-side** — no server, no account, no upload

## Live hosting (Cloudflare)

Deployed via **Cloudflare Workers** (static assets) + GitHub — see **`wrangler.jsonc`** and **[DEPLOY-CLOUDFLARE.md](./DEPLOY-CLOUDFLARE.md)** for the **2026 dashboard** (Workers & Pages → your app → **Settings → Builds**).

Your live URL is shown on the project overview as **`*.workers.dev`** (click **Visit**). It is not always `*.pages.dev`.

GitHub Pages (`https://muthuarasu41193.github.io/amazon-label-cropper/`) also works — use **one** host only to avoid stale cache.

## Run locally

```bash
cd amazon-label-cropper
python -m http.server 5501
```

Open [http://127.0.0.1:5501](http://127.0.0.1:5501) for the hub, or go directly to a tool:

- [Amazon cropper](http://127.0.0.1:5501/crop.html?p=amazon)
- [Flipkart cropper](http://127.0.0.1:5501/crop.html?p=flipkart)
- [Meesho cropper](http://127.0.0.1:5501/crop.html?p=meesho)
- [Manifest Creator](http://127.0.0.1:5501/manifest.html)

## Project structure

```
index.html          Hub — pick a platform or suite tool
crop.html?p=…       Label cropper workbench
manifest.html       Dispatch manifest from shipping-label PDFs
js/platforms.js     Platform presets & suite tools
js/crop-engine.js   PDF crop logic
js/cropper-app.js   Cropper UI
js/manifest-parser.js  AWB / order extraction
js/manifest-app.js  Manifest UI
js/hub.js           Hub rendering
css/                Premium design system
```

## Adding a platform

Edit `js/platforms.js` — add an entry to `PLATFORMS` with `defaults` (layout, widths, invoice text). The hub and cropper pick it up automatically.

## Legacy note

The original single-page Amazon cropper (`app.js` / old `index.html`) has been replaced by this suite. Use `cropper.html?p=amazon` for the same workflow with the new UI.
