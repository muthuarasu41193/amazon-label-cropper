import type { CropSettings } from "./crop-engine";
import {
  getPlatformLayout,
  isTopSplitStrategy,
  rigidBoxesForPage,
  type Box,
  type Pair,
} from "./platform-layouts";

const LABEL_TEXT_PATTERN =
  /\b(ship\s*to|ship\s*from|deliver\s*to|shipment|tracking|awb|fba|amazon|courier|consignee|pickup|order\s*(?:id|no|number)|shipment\s*id|carrier|destination|return\s*to|sold\s*by|fulfillment|waybill|barcode|dispatch|consignment|ekart|shadowfax|delhivery|valmo|meesho|flipkart)\b/i;

const INVOICE_TEXT_PATTERN =
  /\b(description|invoice|tax\s*invoice|qty|quantity|unit\s*price|hsn|gst|subtotal|amount|bill\s*to|cgst|sgst|igst|gstin)\b/i;

const INVOICE_ONLY_PATTERN =
  /\b(tax\s*invoice|invoice\s*number|invoice\s*date|amount\s*in\s*words|authorized\s*signatory|place\s*of\s*supply)\b/i;

function pdfBoxToCanvasRect(box: Box, pageWidth: number, pageHeight: number, viewport: { width: number; height: number }) {
  const x = (box.left / pageWidth) * viewport.width;
  const y = ((pageHeight - box.top) / pageHeight) * viewport.height;
  const w = ((box.right - box.left) / pageWidth) * viewport.width;
  const h = ((box.top - box.bottom) / pageHeight) * viewport.height;
  return { x, y, w, h };
}

function textItemsInRegion(
  textContent: { items: { str?: string; transform?: number[] }[] },
  box: Box,
  pageHeight: number,
) {
  const results: string[] = [];
  for (const flipY of [false, true]) {
    for (const item of textContent.items) {
      if (!item.str || !item.transform) continue;
      const rawY = item.transform[5];
      const x = item.transform[4];
      const y = flipY ? pageHeight - rawY : rawY;
      if (x >= box.left && x <= box.right && y >= box.bottom && y <= box.top) {
        results.push(item.str);
      }
    }
  }
  return results.join(" ");
}

function boxArea(box: Box) {
  return Math.max(0, box.right - box.left) * Math.max(0, box.top - box.bottom);
}

function boxOverlapRatio(a: Box, b: Box) {
  const overlapLeft = Math.max(a.left, b.left);
  const overlapRight = Math.min(a.right, b.right);
  const overlapBottom = Math.max(a.bottom, b.bottom);
  const overlapTop = Math.min(a.top, b.top);
  if (overlapRight <= overlapLeft || overlapTop <= overlapBottom) return 0;
  const overlapArea = (overlapRight - overlapLeft) * (overlapTop - overlapBottom);
  return overlapArea / Math.min(boxArea(a), boxArea(b));
}

function dedupeBoxes(boxes: Box[], overlapThreshold = 0.7) {
  const kept: Box[] = [];
  for (const box of boxes) {
    const duplicate = kept.some((existing) => boxOverlapRatio(existing, box) > overlapThreshold);
    if (!duplicate) kept.push(box);
  }
  return kept;
}

function scoreRegionPixels(imageData: ImageData, canvasWidth: number, rect: { x: number; y: number; w: number; h: number }) {
  const startX = Math.max(0, Math.floor(rect.x));
  const startY = Math.max(0, Math.floor(rect.y));
  const endX = Math.min(imageData.width, Math.ceil(rect.x + rect.w));
  const endY = Math.min(imageData.height, Math.ceil(rect.y + rect.h));

  if (endX <= startX || endY <= startY) return { density: 0, barcodeScore: 0 };

  let darkPixels = 0;
  let totalPixels = 0;
  let barcodeRows = 0;

  for (let py = startY; py < endY; py++) {
    let rowDark = 0;
    let rowTransitions = 0;
    let prevDark = false;

    for (let px = startX; px < endX; px++) {
      const idx = (py * canvasWidth + px) * 4;
      const brightness = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
      const isDark = brightness < 205;
      if (isDark) {
        darkPixels++;
        rowDark++;
      }
      if (px > startX && isDark !== prevDark) rowTransitions++;
      prevDark = isDark;
    }

    totalPixels += endX - startX;
    if (rowTransitions > 10 && rowDark > (endX - startX) * 0.15) barcodeRows++;
  }

  const density = totalPixels > 0 ? darkPixels / totalPixels : 0;
  const barcodeScore = barcodeRows >= 4 ? 0.3 : barcodeRows >= 2 ? 0.15 : 0;

  return { density, barcodeScore };
}

async function renderPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfPage: any,
  scale = 2,
) {
  const viewport = pdfPage.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create canvas context");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  return { canvas, ctx, viewport };
}

function scoreLabelRegion(
  imageData: ImageData,
  viewport: { width: number; height: number },
  box: Box,
  pageWidth: number,
  pageHeight: number,
  regionText: string,
) {
  const rect = pdfBoxToCanvasRect(box, pageWidth, pageHeight, viewport);
  const { density, barcodeScore } = scoreRegionPixels(imageData, viewport.width, rect);

  const hasLabelText = LABEL_TEXT_PATTERN.test(regionText);
  const hasInvoiceText = INVOICE_TEXT_PATTERN.test(regionText);
  const textScore = hasLabelText ? 0.35 : 0;
  const invoicePenalty = hasInvoiceText && !hasLabelText ? -0.35 : 0;

  const score = density * 0.45 + barcodeScore + textScore + invoicePenalty;
  return { score, density, hasLabelText, hasInvoiceText, hasBarcode: barcodeScore > 0 };
}

/** Returns true when the page is invoice-only (no shipping label content). */
function isInvoiceOnlyPage(
  scored: { hasLabelText: boolean; hasInvoiceText: boolean; hasBarcode: boolean; density: number }[],
) {
  const anyLabelContent = scored.some(
    (s) => s.hasLabelText || s.hasBarcode || (s.density > 0.04 && !s.hasInvoiceText),
  );
  if (anyLabelContent) return false;

  const allInvoice = scored.every((s) => s.hasInvoiceText && !s.hasLabelText && !s.hasBarcode);
  const lowDensity = scored.every((s) => s.density < 0.025);

  return allInvoice || lowDensity;
}

function generateAutoCandidateBoxes(pageWidth: number, pageHeight: number, settings: CropSettings) {
  const margin = Math.min(pageWidth, pageHeight) * (Number(settings.marginPercent) / 100);
  const candidates: Box[] = [];

  const profile = getPlatformLayout(settings.platformId ?? "generic");

  // Platform-priority rigid candidates first.
  const rigid = rigidBoxesForPage(pageWidth, pageHeight, profile, settings);
  for (const pair of rigid) {
    candidates.push(pair.labelBox);
  }

  const colWidths = [0.42, 0.48, 0.5, 0.52, 0.55];
  const rowHeights = [0.4, 0.46, 0.5, 0.55, 0.58];
  const colStarts = [0, 0.02, 0.48, 0.5, 0.52];
  const rowStarts = [0, 0.02, 0.42, 0.48, 0.5, 0.52];

  for (const colStart of colStarts) {
    for (const rowStart of rowStarts) {
      for (const colW of colWidths) {
        for (const rowH of rowHeights) {
          const left = pageWidth * colStart + margin;
          const bottom = pageHeight * rowStart + margin;
          const right = Math.min(left + pageWidth * colW - margin, pageWidth - margin);
          const top = Math.min(bottom + pageHeight * rowH - margin, pageHeight - margin);

          if (right - left > pageWidth * 0.18 && top - bottom > pageHeight * 0.14) {
            candidates.push({ left, bottom, right, top });
          }
        }
      }
    }
  }

  return dedupeBoxes(candidates, 0.65);
}

function findInvoiceBoxForLabel(labelBox: Box, pageWidth: number, pageHeight: number, margin: number, settings: CropSettings) {
  const profile = getPlatformLayout(settings.platformId ?? "generic");

  if (isTopSplitStrategy(profile.strategy)) {
    return {
      left: margin,
      bottom: margin,
      right: pageWidth - margin,
      top: labelBox.bottom - margin,
    };
  }

  const centerX = (labelBox.left + labelBox.right) / 2;
  const isLeft = centerX < pageWidth * 0.45;

  if (isLeft) {
    return {
      left: labelBox.right + margin,
      bottom: labelBox.bottom - margin,
      right: pageWidth - margin,
      top: labelBox.top + margin,
    };
  }

  return {
    left: margin,
    bottom: labelBox.bottom - margin,
    right: labelBox.left - margin,
    top: labelBox.top + margin,
  };
}

function selectBestLabels(
  scored: { box: Box; score: number; density: number }[],
  pageArea: number,
  maxLabels: number,
) {
  const minScore = 0.12;
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const selected: { box: Box; score: number; density: number }[] = [];

  for (const candidate of sorted) {
    if (candidate.score < minScore) continue;

    const areaRatio = boxArea(candidate.box) / pageArea;
    if (areaRatio > 0.72 || areaRatio < 0.05) continue;

    const overlaps = selected.some((s) => boxOverlapRatio(s.box, candidate.box) > 0.35);
    if (!overlaps) selected.push(candidate);
    if (selected.length >= maxLabels) break;
  }

  selected.sort((a, b) => {
    const aCenterY = (a.box.bottom + a.box.top) / 2;
    const bCenterY = (b.box.bottom + b.box.top) / 2;
    if (Math.abs(aCenterY - bCenterY) > 20) return bCenterY - aCenterY;
    return a.box.left - b.box.left;
  });

  return selected;
}

/**
 * Platform-aware rigid label scan.
 * Uses official layout coordinates first, then validates with ink density and text markers.
 */
export async function scanPageForLabels(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfPage: any,
  pageWidth: number,
  pageHeight: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textContent: any,
  settings: CropSettings,
) {
  const profile = getPlatformLayout(settings.platformId ?? "generic");
  const margin = Math.min(pageWidth, pageHeight) * (Number(settings.marginPercent) / 100);
  const { ctx, viewport } = await renderPage(pdfPage, 2);
  const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height);

  // Rigid platform layout — primary path for known marketplaces.
  if (profile.strategy !== "auto") {
    const rigidPairs = rigidBoxesForPage(pageWidth, pageHeight, profile, settings);
    const validated: Pair[] = [];

    const scoredRigid = rigidPairs.map((pair) => {
      const regionText = textItemsInRegion(textContent, pair.labelBox, pageHeight);
      const metrics = scoreLabelRegion(imageData, viewport, pair.labelBox, pageWidth, pageHeight, regionText);
      return { pair, ...metrics };
    });

    if (isInvoiceOnlyPage(scoredRigid)) {
      return [];
    }

    for (const item of scoredRigid) {
      const isBlank = item.density < 0.018;
      const isInvoice = item.hasInvoiceText && !item.hasLabelText && !item.hasBarcode;

      if (isBlank || isInvoice) continue;

      validated.push(item.pair);
    }

    if (validated.length > 0) return validated;

    // Fallback: accept rigid boxes with any content if not invoice-only page.
    const hasAnyContent = scoredRigid.some((s) => s.density > 0.02);
    if (hasAnyContent && !isInvoiceOnlyPage(scoredRigid)) {
      return rigidPairs.filter((_, i) => scoredRigid[i].density > 0.02);
    }
  }

  // Auto-detect fallback for generic/custom platforms.
  const pageArea = pageWidth * pageHeight;
  const candidates = generateAutoCandidateBoxes(pageWidth, pageHeight, settings);
  const scored: { box: Box; score: number; density: number; hasLabelText: boolean; hasInvoiceText: boolean; hasBarcode: boolean }[] = [];

  for (const box of candidates) {
    const regionText = textItemsInRegion(textContent, box, pageHeight);
    const metrics = scoreLabelRegion(imageData, viewport, box, pageWidth, pageHeight, regionText);
    scored.push({ box, ...metrics });
  }

  let selected = selectBestLabels(scored, pageArea, profile.labelsPerPage);

  if (selected.length === 0) {
    const fallback = scored.filter((s) => s.density > 0.035 && !s.hasInvoiceText).sort((a, b) => b.density - a.density).slice(0, profile.labelsPerPage);
    selected = fallback;
  }

  return selected.map((item) => ({
    labelBox: item.box,
    invoiceBox: findInvoiceBoxForLabel(item.box, pageWidth, pageHeight, margin, settings),
    score: item.score,
  }));
}

export async function regionHasContent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfPage: any,
  box: Box,
  pageWidth: number,
  pageHeight: number,
) {
  const { ctx, viewport } = await renderPage(pdfPage, 1.5);
  const rect = pdfBoxToCanvasRect(box, pageWidth, pageHeight, viewport);
  const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height);
  const { density } = scoreRegionPixels(imageData, viewport.width, rect);
  return density > 0.018;
}

/** Detect if an entire page is invoice-only or blank — should be skipped entirely. */
export async function isPageSkippable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfPage: any,
  pageWidth: number,
  pageHeight: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textContent: any,
  _settings: CropSettings,
) {
  const fullPageText = textItemsInRegion(textContent, { left: 0, bottom: 0, right: pageWidth, top: pageHeight }, pageHeight);
  const isInvoicePage = INVOICE_ONLY_PATTERN.test(fullPageText) && !LABEL_TEXT_PATTERN.test(fullPageText);

  if (isInvoicePage) return true;

  const { ctx, viewport } = await renderPage(pdfPage, 1.5);
  const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height);
  const fullRect = { x: 0, y: 0, w: viewport.width, h: viewport.height };
  const { density } = scoreRegionPixels(imageData, viewport.width, fullRect);

  return density < 0.012;
}
