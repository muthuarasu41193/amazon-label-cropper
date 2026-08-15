/**
 * Tesseract.js OCR for Amazon, Meesho, and Flipkart shipping-label images.
 * Preprocesses each photo, reads the text, then returns structured SKU + platform data.
 */

import { detectPlatform, emptyShipment, extractSkuDetails, parseShipmentText } from "./manifest-parser.js?v=2.6.0";

const PSM_BLOCK = "6";

export async function createOcrWorker() {
  if (!window.Tesseract) {
    throw new Error("Tesseract.js failed to load. Refresh the page and try again.");
  }

  const worker = await window.Tesseract.createWorker("eng", 1, {
    logger: () => {},
  });
  await worker.setParameters({
    tessedit_pageseg_mode: PSM_BLOCK,
    preserve_interword_spaces: "1",
  });
  return worker;
}

export async function terminateOcrWorker(worker) {
  if (!worker) return;
  try {
    await worker.terminate();
  } catch {
    /* worker may already be stopped */
  }
}

function loadImage(source) {
  if (source instanceof HTMLCanvasElement) return Promise.resolve(source);
  if (source instanceof HTMLImageElement) return Promise.resolve(source);

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = source instanceof Blob ? URL.createObjectURL(source) : String(source);
    image.onload = () => {
      if (source instanceof Blob) URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      if (source instanceof Blob) URL.revokeObjectURL(url);
      reject(new Error("Could not read this image for OCR."));
    };
    image.src = url;
  });
}

/** Upscale small photos, convert to high-contrast grayscale for Tesseract. */
export async function preprocessImageForOcr(source) {
  const image = await loadImage(source);
  const srcWidth = image.width || image.naturalWidth;
  const srcHeight = image.height || image.naturalHeight;
  const scale = Math.max(1, 1400 / Math.max(srcWidth, 1));
  const width = Math.round(srcWidth * scale);
  const height = Math.round(srcHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, 0, 0, width, height);

  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const boosted = ((gray / 255 - 0.5) * 1.5 + 0.5) * 255;
    const value = boosted > 188 ? 255 : boosted < 62 ? 0 : boosted;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

function fileNameOf(source) {
  if (source && typeof source.name === "string") return source.name;
  return "";
}

function emptySkuResult(platform = "") {
  return {
    platform: platform === "unknown" ? "" : platform,
    sku: "",
    skus: [],
    asin: "",
    fsn: "",
    fnsku: "",
    productId: "",
    text: "",
    confidence: 0,
    fileName: "",
  };
}

/**
 * OCR a single label image and return structured SKU + platform fields.
 * @param {File|Blob|HTMLCanvasElement|HTMLImageElement} source
 * @param {{ platform?: string, worker: object }} options
 */
export async function recognizeLabelImage(source, { platform = "auto", worker } = {}) {
  if (!worker) throw new Error("OCR worker is required.");

  const canvas = await preprocessImageForOcr(source);
  const first = await worker.recognize(canvas);
  const text = first.data?.text || "";
  const details = extractSkuDetails(text, platform);
  const detected = details.platform || detectPlatform(text);

  return {
    ...emptySkuResult(platform === "auto" ? detected : platform),
    ...details,
    platform: platform !== "auto" && platform !== "unknown" ? platform : detected === "unknown" ? "" : detected,
    text,
    confidence: Number(first.data?.confidence) || 0,
    fileName: fileNameOf(source),
  };
}

/**
 * Process each uploaded shipping-label image with Tesseract.js.
 * @param {Array<File|Blob|HTMLCanvasElement>} images
 * @param {{ platform?: string, worker?: object, onProgress?: Function }} options
 * @returns {Promise<Array<{ platform: string, sku: string, skus: string[], asin: string, fsn: string, fnsku: string, productId: string, text: string, confidence: number, fileName: string }>>}
 */
export async function extractSkuFromImages(images, { platform = "auto", worker, onProgress } = {}) {
  const list = [...(images || [])].filter(Boolean);
  const ownWorker = !worker;
  const ocr = worker || (await createOcrWorker());
  const results = [];

  try {
    for (let index = 0; index < list.length; index += 1) {
      const source = list[index];
      onProgress?.({
        index: index + 1,
        total: list.length,
        percent: Math.round((index / Math.max(list.length, 1)) * 100),
        fileName: fileNameOf(source),
        phase: "ocr",
      });
      const result = await recognizeLabelImage(source, { platform, worker: ocr });
      results.push(result);
      onProgress?.({
        index: index + 1,
        total: list.length,
        percent: Math.round(((index + 1) / Math.max(list.length, 1)) * 100),
        fileName: result.fileName,
        phase: "ocr",
        sku: result.sku,
      });
    }
  } finally {
    if (ownWorker) await terminateOcrWorker(ocr);
  }

  return results;
}

export async function recognizePdfPages(file, { platform = "auto", worker, maxPages = 4, onProgress } = {}) {
  if (!worker) throw new Error("OCR worker is required.");

  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pages = Math.min(pdf.numPages, maxPages);
  const chunks = [];

  for (let pageIndex = 1; pageIndex <= pages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 1.7 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    onProgress?.({ page: pageIndex, total: pages, percent: Math.round((pageIndex / pages) * 100), phase: "ocr" });
    const result = await recognizeLabelImage(canvas, { platform, worker });
    chunks.push(result);
  }

  await pdf.destroy();

  const text = chunks.map((chunk) => chunk.text).join("\n");
  const details = extractSkuDetails(text, platform);
  const best = chunks.find((chunk) => chunk.sku) || chunks[0] || emptySkuResult(platform);

  return {
    ...best,
    ...details,
    platform: platform !== "auto" ? platform : details.platform || best.platform,
    text,
    fileName: file.name,
    confidence: chunks.reduce((sum, chunk) => sum + (chunk.confidence || 0), 0) / Math.max(chunks.length, 1),
  };
}

/** Turn OCR output into a manifest row, keeping SKU even when AWB/order is missing. */
export function shipmentFromOcrResult(result, platformHint = "auto") {
  const parsed = parseShipmentText(result?.text || "", platformHint) || emptyShipment();
  const platform = platformHint !== "auto" ? platformHint : result?.platform || parsed.platform;
  const sku = result?.sku || parsed.sku || "";
  parsed.platform = platform || parsed.platform;
  parsed.sku = sku;
  if (!parsed.product || parsed.product === sku) {
    parsed.product = result?.productId || parsed.product || sku;
  }

  if (!parsed.orderId && !parsed.awb && !parsed.sku) return null;
  return parsed;
}
