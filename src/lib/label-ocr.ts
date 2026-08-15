/**
 * Tesseract.js OCR for Amazon, Meesho, and Flipkart shipping-label images.
 * Preprocesses each photo, reads the text, then returns structured SKU + platform data.
 */
import * as pdfjs from "pdfjs-dist";
import { initPdfJsWorker } from "./crop-engine";
import {
  detectPlatform,
  emptyShipment,
  extractSkuDetails,
  parseShipmentText,
  skuCountsFromText,
  type Shipment,
  type SkuCount,
  type SkuDetails,
} from "./manifest-parser";

type TesseractRecognizeResult = {
  data?: { text?: string; confidence?: number };
};

type TesseractWorker = {
  setParameters: (params: Record<string, string>) => Promise<void>;
  recognize: (image: HTMLCanvasElement) => Promise<TesseractRecognizeResult>;
  terminate: () => Promise<void>;
};

type TesseractAPI = {
  createWorker: (
    lang: string,
    oem: number,
    options?: { logger?: () => void },
  ) => Promise<TesseractWorker>;
};

declare global {
  interface Window {
    Tesseract?: TesseractAPI;
  }
}

type ImageSource = File | Blob | HTMLCanvasElement | HTMLImageElement | string;

export type SkuResult = SkuDetails & {
  text: string;
  confidence: number;
  fileName: string;
};

export async function loadTesseract(): Promise<TesseractAPI> {
  if (typeof window === "undefined") throw new Error("OCR only runs in the browser.");
  if (window.Tesseract) return window.Tesseract;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector("script[data-tesseract]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Tesseract.js failed to load.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    script.dataset.tesseract = "true";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Tesseract.js failed to load."));
    document.head.appendChild(script);
  });
  if (!window.Tesseract) throw new Error("Tesseract.js failed to load.");
  return window.Tesseract;
}

const PSM_BLOCK = "6";

export async function createOcrWorker(): Promise<TesseractWorker> {
  const Tesseract = await loadTesseract();
  const worker = await Tesseract.createWorker("eng", 1, {
    logger: () => {},
  });
  await worker.setParameters({
    tessedit_pageseg_mode: PSM_BLOCK,
    preserve_interword_spaces: "1",
  });
  return worker;
}

export async function terminateOcrWorker(worker?: TesseractWorker | null) {
  if (!worker) return;
  try {
    await worker.terminate();
  } catch {
    /* worker may already be stopped */
  }
}

function loadImage(source: ImageSource): Promise<HTMLCanvasElement | HTMLImageElement> {
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
export async function preprocessImageForOcr(source: ImageSource) {
  const image = await loadImage(source);
  const srcWidth = image.width || ("naturalWidth" in image ? image.naturalWidth : 0);
  const srcHeight = image.height || ("naturalHeight" in image ? image.naturalHeight : 0);
  const scale = Math.max(1, 1400 / Math.max(srcWidth, 1));
  const width = Math.round(srcWidth * scale);
  const height = Math.round(srcHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create a canvas for OCR.");
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

function fileNameOf(source: unknown) {
  if (source && typeof source === "object" && "name" in source && typeof source.name === "string") {
    return source.name;
  }
  return "";
}

function emptySkuResult(platform = ""): SkuResult {
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
 */
export async function recognizeLabelImage(
  source: File | Blob | HTMLCanvasElement | HTMLImageElement,
  options: { platform?: string; worker?: TesseractWorker } = {},
): Promise<SkuResult> {
  const { platform = "auto", worker } = options;
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
 */
export async function extractSkuFromImages(
  images: Array<File | Blob | HTMLCanvasElement>,
  options: {
    platform?: string;
    worker?: TesseractWorker;
    onProgress?: (progress: {
      index?: number;
      total?: number;
      percent?: number;
      fileName?: string;
      phase?: string;
      sku?: string;
    }) => void;
  } = {},
): Promise<SkuResult[]> {
  const { platform = "auto", worker, onProgress } = options;
  const list = [...(images || [])].filter(Boolean);
  const ownWorker = !worker;
  const ocr = worker || (await createOcrWorker());
  const results: SkuResult[] = [];

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

export async function recognizePdfPages(
  file: File,
  options: {
    platform?: string;
    worker?: TesseractWorker;
    maxPages?: number;
    onProgress?: (progress: { page?: number; total?: number; percent?: number; phase?: string }) => void;
  } = {},
): Promise<SkuResult> {
  const { platform = "auto", worker, maxPages = 4, onProgress } = options;
  if (!worker) throw new Error("OCR worker is required.");
  initPdfJsWorker();

  const bytes = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = Math.min(pdf.numPages, maxPages);
  const chunks: SkuResult[] = [];

  for (let pageIndex = 1; pageIndex <= pages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 1.7 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) throw new Error("Could not create a canvas for PDF OCR.");
    await page.render({ canvasContext, viewport }).promise;
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
export function shipmentFromOcrResult(
  result: Partial<SkuResult> | null | undefined,
  platformHint = "auto",
): Shipment | null {
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

export function skuCountFromOcrResult(
  result: Partial<SkuResult> | null | undefined,
  platformHint = "auto",
): SkuCount | null {
  return skuCountsFromOcrResult(result, platformHint)[0] || null;
}

export function skuCountsFromOcrResult(
  result: Partial<SkuResult> | null | undefined,
  platformHint = "auto",
): SkuCount[] {
  const platform = platformHint !== "auto" ? platformHint : result?.platform || "auto";
  return skuCountsFromText(result?.text || "", platform);
}

function splitCanvasIntoQuadrants(canvas: HTMLCanvasElement) {
  const width = canvas.width / 2;
  const height = canvas.height / 2;
  return [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].map(([x, y]) => {
    const tile = document.createElement("canvas");
    tile.width = width;
    tile.height = height;
    const ctx = tile.getContext("2d");
    if (!ctx) return tile;
    ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
    return tile;
  });
}

/** OCR each PDF page (and 4-up tiles when several SKU labels appear) into SKU + qty rows. */
export async function extractSkuCountsFromPdfOcr(
  file: File,
  options: {
    platform?: string;
    worker?: TesseractWorker;
    maxPages?: number;
    onProgress?: (progress: { page?: number; total?: number; percent?: number; phase?: string }) => void;
  } = {},
): Promise<SkuCount[]> {
  const { platform = "auto", worker, maxPages = 40, onProgress } = options;
  if (!worker) throw new Error("OCR worker is required.");
  initPdfJsWorker();

  const bytes = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = Math.min(pdf.numPages, maxPages);
  const collected: SkuCount[] = [];

  for (let pageIndex = 1; pageIndex <= pages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 1.7 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) throw new Error("Could not create a canvas for PDF OCR.");
    await page.render({ canvasContext, viewport }).promise;
    onProgress?.({ page: pageIndex, total: pages, percent: Math.round((pageIndex / pages) * 100), phase: "ocr" });

    const full = await recognizeLabelImage(canvas, { platform, worker });
    if (platform === "flipkart") {
      collected.push(...skuCountsFromOcrResult(full, platform));
    } else {
      const skuLabelHits = (full.text.match(/\bsku(?:\s*id)?\b/gi) || []).length;
      if (skuLabelHits >= 2) {
        for (const tile of splitCanvasIntoQuadrants(canvas)) {
          const result = await recognizeLabelImage(tile, { platform, worker });
          collected.push(...skuCountsFromOcrResult(result, platform));
        }
      } else {
        collected.push(...skuCountsFromOcrResult(full, platform));
      }
    }
  }

  await pdf.destroy();
  return collected;
}
