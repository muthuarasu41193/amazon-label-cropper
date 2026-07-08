import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import { resolveOutputSize } from "./label-presets";
import { applyPlatformLayoutToSettings, getPlatformLayout, rigidBoxesForPage, topSplitY } from "./platform-layouts";
import {
  detectPlatformFromPdfJs,
  isPageSkippable,
  regionHasContent,
  scanPageForLabels,
  shouldAutoDetectPlatform,
} from "./label-scanner";

export type CropSettings = {
  platformId: string;
  cropPreset: string;
  leftPercent: number;
  labelHeightPercent: number;
  marginPercent: number;
  pageSize: string;
  fitMode: string;
  skipBlank: boolean;
  includeInvoiceText: boolean;
  smartScan: boolean;
  labelPreset: string;
  customWidthMm: number;
  customHeightMm: number;
};

export type CropProgress = {
  phase: string;
  percent: number;
  page?: number;
  total?: number;
};

type Box = { left: number; bottom: number; right: number; top: number };
type Pair = { labelBox: Box; invoiceBox: Box };
type ProductDetails = { productName: string; quantity: string } | null;

let workerReady = false;

export function initPdfJsWorker() {
  if (workerReady || typeof window === "undefined") return;
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  workerReady = true;
}

function getOutputSize(cropWidth: number, cropHeight: number, settings: CropSettings) {
  if (settings.pageSize === "source") return { width: cropWidth, height: cropHeight };
  return resolveOutputSize(settings) ?? { width: cropWidth, height: cropHeight };
}

function pairedBoxesForPage(page: PDFPage, settings: CropSettings): Pair[] {
  const { width, height } = page.getSize();
  const profile = getPlatformLayout(settings.platformId ?? "generic");

  // Use rigid platform layout when smart scan is off but platform is known.
  if (profile.strategy !== "auto" || settings.cropPreset === "top-split") {
    return rigidBoxesForPage(width, height, profile, settings);
  }

  const leftWidth = width * (Number(settings.leftPercent) / 100);
  const rightStart = width - leftWidth;
  const margin = Math.min(width, height) * (Number(settings.marginPercent) / 100);
  const boxWidth = Math.max(1, leftWidth - margin * 2);
  const preset = settings.cropPreset;

  if (preset === "right-half") {
    return [
      {
        labelBox: { left: rightStart + margin, bottom: height / 2 + margin, right: width - margin, top: height - margin },
        invoiceBox: { left: margin, bottom: height / 2 + margin, right: leftWidth - margin, top: height - margin },
      },
      {
        labelBox: { left: rightStart + margin, bottom: margin, right: width - margin, top: height / 2 - margin },
        invoiceBox: { left: margin, bottom: margin, right: leftWidth - margin, top: height / 2 - margin },
      },
    ];
  }

  if (preset === "top-half" || preset === "top-split") {
    // labelHeightPercent = height of the TOP band (from page top).
    const labelHeightPct = settings.labelHeightPercent ?? profile.labelHeightPercent;
    const splitY = topSplitY(height, labelHeightPct);
    return [
      {
        labelBox: { left: margin, bottom: splitY + margin, right: width - margin, top: height - margin },
        invoiceBox: { left: margin, bottom: margin, right: width - margin, top: Math.max(margin, splitY - margin) },
      },
    ];
  }

  if (preset === "bottom-half") {
    const labelHeightPct = settings.labelHeightPercent ?? 50;
    const splitY = topSplitY(height, labelHeightPct);
    return [
      {
        labelBox: { left: margin, bottom: margin, right: width - margin, top: Math.max(margin, splitY - margin) },
        invoiceBox: { left: margin, bottom: splitY + margin, right: width - margin, top: height - margin },
      },
    ];
  }

  return [
    {
      labelBox: { left: margin, bottom: height / 2 + margin, right: margin + boxWidth, top: height - margin },
      invoiceBox: { left: rightStart + margin, bottom: height / 2 + margin, right: width - margin, top: height - margin },
    },
    {
      labelBox: { left: margin, bottom: margin, right: margin + boxWidth, top: height / 2 - margin },
      invoiceBox: { left: rightStart + margin, bottom: margin, right: width - margin, top: height / 2 - margin },
    },
  ];
}

function makePdfTextSafe(text: string) {
  return text
    .replace(/₹/g, "Rs.")
    .replace(/[–—]/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, maxWidth: number) {
  const words = makePdfTextSafe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

type TextItem = { text: string; x: number; y: number };

function itemRows(items: TextItem[]) {
  const rows: { y: number; items: TextItem[] }[] = [];
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 3) return b.y - a.y;
    return a.x - b.x;
  });

  for (const item of sorted) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 3);
    if (row) {
      row.items.push(item);
      row.y = (row.y + item.y) / 2;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows
    .map((row) => {
      const rowItems = row.items.sort((a, b) => a.x - b.x);
      return {
        y: row.y,
        items: rowItems,
        text: rowItems.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim(),
      };
    })
    .filter((row) => row.text);
}

function textItemsInBox(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textContent: { items: any[] },
  box: Box,
  pageHeight: number,
  flipY: boolean,
): TextItem[] {
  return textContent.items
    .filter((item) => item.str && item.transform)
    .map((item) => {
      const rawY = item.transform[5] as number;
      return {
        text: item.str as string,
        x: item.transform[4] as number,
        y: flipY ? pageHeight - rawY : rawY,
      };
    })
    .filter((item) => item.x >= box.left && item.x <= box.right && item.y >= box.bottom && item.y <= box.top);
}

function findHeader(rows: ReturnType<typeof itemRows>) {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const description = row.items.find((item) => /description/i.test(item.text));
    const qty = row.items.find((item) => /^qty$/i.test(item.text) || /quantity/i.test(item.text));
    const unit = row.items.find((item) => /unit\s*price/i.test(item.text) || /^unit$/i.test(item.text));

    if (description && (qty || unit)) {
      return {
        index: i,
        descriptionX: description.x,
        unitX: unit?.x ?? qty?.x ?? description.x + 220,
        qtyX: qty?.x ?? null,
      };
    }
  }
  return null;
}

function fixedColumnHeader(items: TextItem[]) {
  if (!items.length) return null;
  const xs = items.map((item) => item.x);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const width = Math.max(1, right - left);
  return {
    index: -1,
    descriptionX: left + width * 0.03,
    unitX: left + width * 0.6,
    qtyX: left + width * 0.68,
  };
}

function extractQuantityFromRowText(text: string) {
  const normalized = text.replace(/₹/g, "Rs.").replace(/\s+/g, " ").trim();
  const priceThenQty = normalized.match(/(?:Rs\.)?\s*\d[\d,.]*\s+(\d{1,3})\s+(?:Rs\.|\d[\d,.]*)/i);
  if (priceThenQty) return priceThenQty[1];
  const qtyText = normalized.match(/\b(?:qty|quantity)\D+(\d{1,3})\b/i);
  if (qtyText) return qtyText[1];
  const smallNumbers = normalized.match(/\b\d{1,3}\b/g) || [];
  return smallNumbers.find((value) => Number(value) > 0 && Number(value) < 1000) || "";
}

function parseProductDetailsFromItems(items: TextItem[]): ProductDetails {
  const rows = itemRows(items);
  const header = findHeader(rows) || fixedColumnHeader(items);
  if (!header) return null;

  const descriptionParts: string[] = [];
  let quantity = "";

  for (const row of rows.slice(Math.max(0, header.index + 1))) {
    if (/\b(total|subtotal|tax|amount in words|signature|authorized)\b/i.test(row.text)) break;
    if (/\b(order number|order date|invoice|place of supply|place of delivery)\b/i.test(row.text)) continue;

    const descriptionText = row.items
      .filter((item) => item.x >= header.descriptionX - 4 && item.x < header.unitX - 4)
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/\bHSN\b.*$/i, "")
      .trim();

    if (descriptionText && !/^\d+$/.test(descriptionText) && !/^hsn\b/i.test(descriptionText)) {
      descriptionParts.push(descriptionText);
    }

    if (!quantity && header.qtyX !== null) {
      const qtyItem = row.items.find(
        (item) => item.x >= header.qtyX! - 18 && item.x <= header.qtyX! + 45 && /^\d{1,3}$/.test(item.text.trim()),
      );
      if (qtyItem) quantity = qtyItem.text.trim();
    }

    if (!quantity) quantity = extractQuantityFromRowText(row.text);
    if (descriptionParts.length >= 10 && quantity) break;
  }

  const productName = descriptionParts.join(" ").replace(/\bHSN\b.*$/i, "").replace(/\s+/g, " ").trim();
  if (!productName && !quantity) return null;
  return { productName, quantity };
}

function isDetected(details: ProductDetails) {
  return Boolean(details?.productName || details?.quantity);
}

async function extractProductDetails(
  pdfBytes: ArrayBuffer,
  sourcePages: PDFPage[],
  allPairs: Pair[][],
  settings: CropSettings,
) {
  // Product name and quantity extraction is Amazon-only.
  if (!settings.includeInvoiceText || settings.platformId !== "amazon") return [] as ProductDetails[];
  initPdfJsWorker();

  const loadingTask = pdfjs.getDocument({ data: pdfBytes.slice(0) });
  const pdf = await loadingTask.promise;
  const details: ProductDetails[] = [];

  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const pdfPage = await pdf.getPage(pageIndex + 1);
    const textContent = await pdfPage.getTextContent();
    const pageHeight = sourcePages[pageIndex].getSize().height;

    for (const pair of allPairs[pageIndex]) {
      const normal = textItemsInBox(textContent, pair.invoiceBox, pageHeight, false);
      const flipped = textItemsInBox(textContent, pair.invoiceBox, pageHeight, true);
      const normalDetails = parseProductDetailsFromItems(normal);
      const flippedDetails = parseProductDetailsFromItems(flipped);
      details.push(normalDetails || flippedDetails || null);
    }
  }

  await loadingTask.destroy();
  return details;
}

function drawProductDetails(
  page: PDFPage,
  details: ProductDetails,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  boldFont: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  target: { width: number; height: number },
  areaHeight: number,
) {
  if (!isDetected(details) || areaHeight <= 0) return;

  const padding = 9;
  const labelSize = 8;
  const bodySize = 7.2;
  const maxWidth = target.width - padding * 2;
  let y = areaHeight - padding - labelSize;

  page.drawText("Product Name -", { x: padding, y, size: labelSize, font: boldFont, color: rgb(0, 0, 0) });
  y -= 10;

  const productLines = wrapText(details?.productName || "", font, bodySize, maxWidth).slice(0, 8);
  for (const line of productLines) {
    if (y < 16) break;
    page.drawText(line, { x: padding, y, size: bodySize, font, color: rgb(0, 0, 0) });
    y -= 8;
  }

  if (y >= 8 && details?.quantity) {
    page.drawText(`Quantity - ${makePdfTextSafe(details.quantity)}`, {
      x: padding,
      y,
      size: labelSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
  }
}

async function looksBlank(
  sourcePdf: PDFDocument,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfJsDoc: any,
  pageIndex: number,
  box: Box,
  settings: CropSettings,
  pageWidth: number,
  pageHeight: number,
) {
  if (!settings.skipBlank) return false;

  if (pdfJsDoc) {
    const pdfPage = await pdfJsDoc.getPage(pageIndex + 1);
    const hasContent = await regionHasContent(pdfPage, box, pageWidth, pageHeight);
    return !hasContent;
  }

  const probePdf = await PDFDocument.create();
  const embedded = await probePdf.embedPage(sourcePdf.getPages()[pageIndex], box);
  const page = probePdf.addPage([embedded.width, embedded.height]);
  page.drawPage(embedded, { x: 0, y: 0 });
  const bytes = await probePdf.save({ useObjectStreams: false });
  return bytes.length < 1400;
}

async function resolvePagePairs(
  sourcePages: PDFPage[],
  settings: CropSettings,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfJsDoc: any,
  onProgress?: (progress: CropProgress) => void,
) {
  const allPairs: Pair[][] = [];

  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const page = sourcePages[pageIndex];
    const { width, height } = page.getSize();

    onProgress?.({
      phase: "scanning",
      page: pageIndex + 1,
      total: sourcePages.length,
      percent: Math.round(((pageIndex + 0.5) / sourcePages.length) * 60),
    });

    if (pdfJsDoc) {
      const pdfPage = await pdfJsDoc.getPage(pageIndex + 1);
      const textContent = await pdfPage.getTextContent();

      // Skip invoice-only or blank pages entirely — no empty output pages.
      if (await isPageSkippable(pdfPage, width, height, textContent)) {
        allPairs.push([]);
        continue;
      }

      if (settings.smartScan) {
        const detected = await scanPageForLabels(pdfPage, width, height, textContent, settings);
        if (detected.length > 0) {
          allPairs.push(detected);
          continue;
        }
      }
    }

    allPairs.push(pairedBoxesForPage(page, settings));
  }

  return allPairs;
}

export async function createCroppedPdf(
  file: File,
  settings: CropSettings,
  onProgress?: (progress: CropProgress) => void,
) {
  const bytes = await file.arrayBuffer();
  onProgress?.({ phase: "loading", percent: 5 });

  const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const outputPdf = await PDFDocument.create();
  const textFont = await outputPdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await outputPdf.embedFont(StandardFonts.HelveticaBold);
  const sourcePages = sourcePdf.getPages();

  // Always load pdf.js for marketplace PDFs so invoice pages can be skipped and
  // Amazon / Flipkart / Meesho can be auto-detected from text markers.
  const needsPdfJs =
    settings.smartScan ||
    settings.includeInvoiceText ||
    shouldAutoDetectPlatform(settings.platformId ?? "generic");

  let pdfJsDoc = null;
  if (needsPdfJs) {
    initPdfJsWorker();
    pdfJsDoc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
  }

  let effectiveSettings = { ...settings };

  if (pdfJsDoc && shouldAutoDetectPlatform(settings.platformId ?? "generic")) {
    onProgress?.({ phase: "detecting", percent: 8 });
    const detected = await detectPlatformFromPdfJs(pdfJsDoc, 3);
    if (detected && detected !== settings.platformId) {
      // Keep user toggles (product text, blank skip, scan) but switch layout geometry.
      effectiveSettings = applyPlatformLayoutToSettings(detected, {
        ...settings,
        platformId: detected,
        includeInvoiceText: detected === "amazon" ? settings.includeInvoiceText : false,
      });
    }
  }

  onProgress?.({ phase: "scanning", percent: 10 });
  const allPairs = await resolvePagePairs(sourcePages, effectiveSettings, pdfJsDoc, onProgress);
  const productDetails = await extractProductDetails(bytes, sourcePages, allPairs, effectiveSettings);
  let labelsAdded = 0;
  let detailsIndex = 0;

  onProgress?.({ phase: "cropping", percent: 65 });

  const showProductInfo = effectiveSettings.includeInvoiceText && effectiveSettings.platformId === "amazon";

  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const pairs = allPairs[pageIndex];
    const { width, height } = sourcePages[pageIndex].getSize();

    for (const pair of pairs) {
      const details = productDetails[detailsIndex] || null;
      detailsIndex += 1;

      if (await looksBlank(sourcePdf, pdfJsDoc, pageIndex, pair.labelBox, effectiveSettings, width, height)) continue;

      const label = await outputPdf.embedPage(sourcePages[pageIndex], pair.labelBox);
      const target = getOutputSize(label.width, label.height, effectiveSettings);
      const page = outputPdf.addPage([target.width, target.height]);
      const infoAreaHeight =
        showProductInfo && effectiveSettings.pageSize !== "source" ? Math.min(132, target.height * 0.31) : 0;
      const labelAreaHeight = target.height - infoAreaHeight;

      page.drawRectangle({ x: 0, y: 0, width: target.width, height: target.height, color: rgb(1, 1, 1) });

      const scale =
        effectiveSettings.fitMode === "cover"
          ? Math.max(target.width / label.width, labelAreaHeight / label.height)
          : Math.min(target.width / label.width, labelAreaHeight / label.height);
      const drawWidth = label.width * scale;
      const drawHeight = label.height * scale;

      page.drawPage(label, {
        x: (target.width - drawWidth) / 2,
        y: infoAreaHeight + (labelAreaHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });

      drawProductDetails(page, details, textFont, boldFont, target, infoAreaHeight);
      labelsAdded += 1;
    }

    onProgress?.({
      phase: "cropping",
      page: pageIndex + 1,
      total: sourcePages.length,
      percent: 65 + Math.round(((pageIndex + 1) / sourcePages.length) * 30),
    });
  }

  if (!labelsAdded) {
    const hints: string[] = [];
    if (effectiveSettings.skipBlank) hints.push("turn off blank-label skipping");
    if (effectiveSettings.smartScan) hints.push("try manual layout mode");
    const hint = hints.length ? ` Try: ${hints.join(", ")}.` : "";
    throw new Error(`No labels were detected.${hint}`);
  }

  onProgress?.({ phase: "done", percent: 100 });
  const outputBytes = await outputPdf.save();
  return {
    outputBytes,
    pageCount: sourcePages.length,
    labelsAdded,
    detectedPlatformId: effectiveSettings.platformId,
  };
}
