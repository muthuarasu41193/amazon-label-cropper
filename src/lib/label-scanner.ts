import type { CropSettings } from "./crop-engine";
import {
  amazonSingleLabelBoxes,
  flipkartLabelBoxes,
  getPlatformLayout,
  isLeftColumnStrategy,
  isTopSplitStrategy,
  leftColumnBoxes,
  rigidBoxesForPage,
  topSplitBoxes,
  FLIPKART_LABEL_HEIGHT_PERCENT,
  FLIPKART_SIDE_INSET_PERCENT,
  type Box,
  type Pair,
} from "./platform-layouts";
import { detectPlatformFromText, shouldAutoDetectPlatform } from "./platform-detect";

const LABEL_TEXT_PATTERN =
  /\b(ship\s*to|ship\s*from|deliver\s*to|shipment|tracking|awb|fba|amazon\s+logistics|courier|consignee|pickup|shipment\s*id|carrier|destination|return\s*to|fulfillment|waybill|barcode|dispatch|consignment|ekart|shadowfax|delhivery|valmo|meesho|flipkart|atspl|amzl)\b/i;

const INVOICE_TEXT_PATTERN =
  /\b(description|invoice|tax\s*invoice|qty|quantity|unit\s*price|hsn|gst|subtotal|amount|bill\s*to|cgst|sgst|igst|gstin|sold\s*by|payment\s*transaction)\b/i;

const INVOICE_ONLY_PATTERN =
  /\b(tax\s*invoice|invoice\s*number|invoice\s*date|amount\s*in\s*words|authorized\s*signatory|place\s*of\s*supply|taxable\s*value|total\s*invoice\s*value|payment\s*transaction\s*id|pan\s*no|gst\s*registration)\b/i;

const CONTENT_DENSITY = 0.018;
const BLANK_PAGE_DENSITY = 0.012;
const INVOICE_LOW_DENSITY = 0.025;

/** Marketplaces that must have a scannable barcode on every kept label crop. */
function requiresBarcode(platformId?: string) {
  return platformId === "amazon" || platformId === "flipkart" || platformId === "meesho";
}

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

export function fullPageText(
  textContent: { items: { str?: string; transform?: number[] }[] },
  pageWidth: number,
  pageHeight: number,
) {
  return textItemsInRegion(textContent, { left: 0, bottom: 0, right: pageWidth, top: pageHeight }, pageHeight);
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

function clampBox(box: Box, pageWidth: number, pageHeight: number, margin: number): Box {
  return {
    left: Math.max(margin, Math.min(box.left, pageWidth - margin - 1)),
    bottom: Math.max(margin, Math.min(box.bottom, pageHeight - margin - 1)),
    right: Math.max(margin + 1, Math.min(box.right, pageWidth - margin)),
    top: Math.max(margin + 1, Math.min(box.top, pageHeight - margin)),
  };
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

/**
 * Find ink extremes inside a candidate region and tighten the crop box so
 * we don't clip barcodes or leave large empty margins that cause "half label" output.
 */
function refineBoxToInk(
  imageData: ImageData,
  viewport: { width: number; height: number },
  box: Box,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  options?: { allowTightCrop?: boolean },
): Box {
  const rect = pdfBoxToCanvasRect(box, pageWidth, pageHeight, viewport);
  const startX = Math.max(0, Math.floor(rect.x));
  const startY = Math.max(0, Math.floor(rect.y));
  const endX = Math.min(imageData.width, Math.ceil(rect.x + rect.w));
  const endY = Math.min(imageData.height, Math.ceil(rect.y + rect.h));

  if (endX - startX < 8 || endY - startY < 8) return box;

  const colDark = new Float32Array(endX - startX);
  const rowDark = new Float32Array(endY - startY);

  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) {
      const idx = (py * imageData.width + px) * 4;
      const brightness = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
      if (brightness < 205) {
        colDark[px - startX] += 1;
        rowDark[py - startY] += 1;
      }
    }
  }

  const colThreshold = (endY - startY) * 0.012;
  const rowThreshold = (endX - startX) * 0.012;

  let minCol = 0;
  let maxCol = colDark.length - 1;
  while (minCol < colDark.length && colDark[minCol] < colThreshold) minCol++;
  while (maxCol > minCol && colDark[maxCol] < colThreshold) maxCol--;

  let minRow = 0;
  let maxRow = rowDark.length - 1;
  while (minRow < rowDark.length && rowDark[minRow] < rowThreshold) minRow++;
  while (maxRow > minRow && rowDark[maxRow] < rowThreshold) maxRow--;

  if (maxCol - minCol < 8 || maxRow - minRow < 8) return box;

  // Pad so barcodes / QR aren't clipped by ink detection.
  const padX = Math.max(2, Math.round((endX - startX) * (options?.allowTightCrop ? 0.012 : 0.02)));
  const padY = Math.max(2, Math.round((endY - startY) * (options?.allowTightCrop ? 0.012 : 0.02)));

  const inkLeft = startX + Math.max(0, minCol - padX);
  const inkRight = startX + Math.min(colDark.length - 1, maxCol + padX) + 1;
  const inkTopCanvas = startY + Math.max(0, minRow - padY);
  const inkBottomCanvas = startY + Math.min(rowDark.length - 1, maxRow + padY) + 1;

  const left = (inkLeft / viewport.width) * pageWidth;
  const right = (inkRight / viewport.width) * pageWidth;
  const top = pageHeight - (inkTopCanvas / viewport.height) * pageHeight;
  const bottom = pageHeight - (inkBottomCanvas / viewport.height) * pageHeight;

  const refined: Box = {
    left: Math.max(box.left, left),
    right: Math.min(box.right, right),
    bottom: Math.max(box.bottom, bottom),
    top: Math.min(box.top, top),
  };

  const originalArea = boxArea(box);
  const refinedArea = boxArea(refined);
  // Flipkart/Meesho centered labels can be ~35–50% of a full-width top-band candidate —
  // allow a tighter crop instead of falling back to the giant box (which then shrinks on 4×6).
  const minAreaRatio = options?.allowTightCrop ? 0.18 : 0.45;
  const minWidthRatio = options?.allowTightCrop ? 0.12 : 0.2;
  if (refinedArea < originalArea * minAreaRatio || refined.right - refined.left < pageWidth * minWidthRatio) {
    return clampBox(box, pageWidth, pageHeight, margin);
  }

  return clampBox(refined, pageWidth, pageHeight, margin);
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

/** Returns true when the page is invoice-only (no shipping label / barcode content). */
function isInvoiceOnlyPage(
  scored: { hasLabelText: boolean; hasInvoiceText: boolean; hasBarcode: boolean; density: number }[],
) {
  // Any real shipping label has a barcode. No barcode ⇒ not a label page.
  if (scored.every((s) => !s.hasBarcode)) return true;

  const anyLabelContent = scored.some((s) => s.hasLabelText || s.hasBarcode);
  if (anyLabelContent) return false;

  const allInvoice = scored.every((s) => s.hasInvoiceText && !s.hasLabelText && !s.hasBarcode);
  const lowDensity = scored.every((s) => s.density < INVOICE_LOW_DENSITY);

  return allInvoice || lowDensity;
}

function generateAutoCandidateBoxes(pageWidth: number, pageHeight: number, settings: CropSettings) {
  const margin = Math.min(pageWidth, pageHeight) * (Number(settings.marginPercent) / 100);
  const candidates: Box[] = [];

  const profile = getPlatformLayout(settings.platformId ?? "generic");

  const rigid = rigidBoxesForPage(pageWidth, pageHeight, profile, settings);
  for (const pair of rigid) {
    candidates.push(pair.labelBox);
  }

  // Extra candidates for Amazon 1-up and Meesho taller labels.
  if (isLeftColumnStrategy(profile.strategy) || profile.strategy === "auto") {
    for (const pair of amazonSingleLabelBoxes(pageWidth, pageHeight, settings.leftPercent ?? 50, settings.marginPercent ?? 0.5)) {
      candidates.push(pair.labelBox);
    }
  }
  if (isTopSplitStrategy(profile.strategy) || profile.strategy === "auto") {
    if (settings.platformId === "flipkart" || profile.strategy === "flipkart-top-split") {
      for (const heightPct of [40, 43, 45, 48]) {
        for (const inset of [22, 25, 27.5, 30]) {
          for (const pair of topSplitBoxes(pageWidth, pageHeight, heightPct, settings.marginPercent ?? 0.25, inset)) {
            candidates.push(pair.labelBox);
          }
        }
      }
    } else {
      for (const heightPct of [50, 55, 58, 60, 62, 65]) {
        for (const pair of topSplitBoxes(pageWidth, pageHeight, heightPct, settings.marginPercent ?? 0.5)) {
          candidates.push(pair.labelBox);
        }
      }
    }
  }

  const colWidths = [0.42, 0.48, 0.5, 0.52, 0.55];
  const rowHeights = [0.4, 0.46, 0.5, 0.55, 0.58, 0.6, 0.62];
  const colStarts = [0, 0.02, 0.48, 0.5, 0.52];
  const rowStarts = [0, 0.02, 0.38, 0.42, 0.48, 0.5, 0.52];

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

  if (isTopSplitStrategy(profile.strategy) || settings.cropPreset === "top-split") {
    return {
      left: margin,
      bottom: margin,
      right: pageWidth - margin,
      top: Math.max(margin, labelBox.bottom - margin),
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
  scored: { box: Box; score: number; density: number; hasBarcode: boolean }[],
  pageArea: number,
  maxLabels: number,
  requireBarcode: boolean,
) {
  const minScore = 0.12;
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const selected: { box: Box; score: number; density: number; hasBarcode: boolean }[] = [];

  for (const candidate of sorted) {
    if (candidate.score < minScore) continue;
    if (requireBarcode && !candidate.hasBarcode) continue;

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

type ScoredPair = {
  pair: Pair;
  score: number;
  density: number;
  hasLabelText: boolean;
  hasInvoiceText: boolean;
  hasBarcode: boolean;
};

function validateAndRefinePairs(
  pairs: Pair[],
  imageData: ImageData,
  viewport: { width: number; height: number },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textContent: any,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  requireBarcode: boolean,
  allowTightCrop = false,
): { validated: Pair[]; scored: ScoredPair[] } {
  const scored: ScoredPair[] = pairs.map((pair) => {
    const regionText = textItemsInRegion(textContent, pair.labelBox, pageHeight);
    const metrics = scoreLabelRegion(imageData, viewport, pair.labelBox, pageWidth, pageHeight, regionText);
    return { pair, ...metrics };
  });

  if (isInvoiceOnlyPage(scored)) {
    return { validated: [], scored };
  }

  const validated: Pair[] = [];
  for (const item of scored) {
    const isBlank = item.density < CONTENT_DENSITY;
    // Invoice fragments / logo+address panels with no barcode must never become output pages.
    const missingBarcode = requireBarcode && !item.hasBarcode;
    const isInvoice = item.hasInvoiceText && !item.hasLabelText && !item.hasBarcode;
    if (isBlank || missingBarcode || isInvoice) continue;

    const refinedLabel = refineBoxToInk(
      imageData,
      viewport,
      item.pair.labelBox,
      pageWidth,
      pageHeight,
      margin,
      { allowTightCrop },
    );
    // Re-check barcode after refine so we didn't crop away the only barcode strip.
    if (requireBarcode) {
      const refinedMetrics = scoreLabelRegion(
        imageData,
        viewport,
        refinedLabel,
        pageWidth,
        pageHeight,
        textItemsInRegion(textContent, refinedLabel, pageHeight),
      );
      if (!refinedMetrics.hasBarcode) continue;
    }

    validated.push({
      labelBox: refinedLabel,
      invoiceBox: item.pair.invoiceBox,
    });
  }

  return { validated, scored };
}

/**
 * Amazon-aware rigid scan: try 2-up left column first, then 1-up top-left,
 * so single-label pages are not cut in half by forcing a bottom crop.
 */
function amazonCandidatePairSets(
  pageWidth: number,
  pageHeight: number,
  settings: CropSettings,
): Pair[][] {
  const widthPct = settings.leftPercent ?? 50;
  const marginPct = settings.marginPercent ?? 0.35;
  return [
    leftColumnBoxes(pageWidth, pageHeight, widthPct, marginPct, 2),
    amazonSingleLabelBoxes(pageWidth, pageHeight, widthPct, marginPct),
    leftColumnBoxes(pageWidth, pageHeight, 48, marginPct, 2),
    leftColumnBoxes(pageWidth, pageHeight, 52, marginPct, 2),
  ];
}

/** Flipkart / Meesho: try a few official height bands around the documented split. */
function topSplitCandidatePairSets(
  pageWidth: number,
  pageHeight: number,
  settings: CropSettings,
  baseHeight: number,
  platformId?: string,
): Pair[][] {
  const marginPct = settings.marginPercent ?? 0.35;

  if (platformId === "flipkart") {
    const heights = [
      settings.labelHeightPercent ?? FLIPKART_LABEL_HEIGHT_PERCENT,
      FLIPKART_LABEL_HEIGHT_PERCENT,
      40,
      43,
      45,
      48,
    ].filter((h, i, arr) => h >= 35 && h <= 55 && arr.indexOf(h) === i);

    const insets = [FLIPKART_SIDE_INSET_PERCENT, 25, 28, 30, 22];
    const sets: Pair[][] = [];
    for (const h of heights) {
      for (const inset of insets) {
        sets.push(topSplitBoxes(pageWidth, pageHeight, h, marginPct, inset));
      }
    }
    // Also include the dedicated Flipkart helper once.
    sets.unshift(flipkartLabelBoxes(pageWidth, pageHeight, settings));
    return sets;
  }

  const heights = [
    settings.labelHeightPercent ?? baseHeight,
    baseHeight,
    baseHeight - 3,
    baseHeight + 3,
    baseHeight - 5,
    baseHeight + 5,
  ].filter((h, i, arr) => h >= 40 && h <= 70 && arr.indexOf(h) === i);

  return heights.map((h) => topSplitBoxes(pageWidth, pageHeight, h, marginPct));
}

/**
 * Platform-aware rigid label scan.
 * Uses official layout coordinates first, validates with ink + text, then refines boundaries.
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
  const barcodeRequired = requiresBarcode(settings.platformId);
  const { ctx, viewport } = await renderPage(pdfPage, 2);
  const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height);

  if (profile.strategy !== "auto") {
    let candidateSets: Pair[][];
    const allowTightCrop = profile.strategy === "flipkart-top-split" || profile.strategy === "meesho-top-split";

    if (profile.strategy === "amazon-left-column") {
      candidateSets = amazonCandidatePairSets(pageWidth, pageHeight, settings);
    } else if (isTopSplitStrategy(profile.strategy)) {
      candidateSets = topSplitCandidatePairSets(
        pageWidth,
        pageHeight,
        settings,
        profile.labelHeightPercent,
        settings.platformId,
      );
    } else {
      candidateSets = [rigidBoxesForPage(pageWidth, pageHeight, profile, settings)];
    }

    let bestValidated: Pair[] = [];
    let bestScore = -1;

    for (const pairs of candidateSets) {
      const { validated, scored } = validateAndRefinePairs(
        pairs,
        imageData,
        viewport,
        textContent,
        pageWidth,
        pageHeight,
        margin,
        barcodeRequired,
        allowTightCrop,
      );

      if (validated.length === 0) continue;

      const acceptedIndexes = new Set<number>();
      for (let i = 0; i < scored.length; i += 1) {
        const isBlank = scored[i].density < CONTENT_DENSITY;
        const missingBarcode = barcodeRequired && !scored[i].hasBarcode;
        const isInvoice = scored[i].hasInvoiceText && !scored[i].hasLabelText && !scored[i].hasBarcode;
        if (!isBlank && !missingBarcode && !isInvoice) acceptedIndexes.add(i);
      }

      const totalScore = [...acceptedIndexes].reduce(
        (sum, i) => sum + scored[i].score + (scored[i].hasBarcode ? 0.2 : 0),
        0,
      );

      // Prefer tighter Flipkart crops (higher density / smaller area with barcode).
      const areaPenalty = validated.reduce((sum, pair) => {
        const ratio = boxArea(pair.labelBox) / (pageWidth * pageHeight);
        return sum + (ratio > 0.35 ? -0.25 : ratio < 0.22 ? 0.15 : 0);
      }, 0);

      const ranked = totalScore + validated.length * 0.15 + areaPenalty;
      if (ranked > bestScore) {
        bestScore = ranked;
        bestValidated = validated;
      }
    }

    // No barcode-backed labels ⇒ skip the page (invoice / payment / logo fragments).
    return bestValidated;
  }

  // Auto-detect fallback for generic/custom platforms.
  const pageArea = pageWidth * pageHeight;
  const candidates = generateAutoCandidateBoxes(pageWidth, pageHeight, settings);
  const scored: {
    box: Box;
    score: number;
    density: number;
    hasLabelText: boolean;
    hasInvoiceText: boolean;
    hasBarcode: boolean;
  }[] = [];

  for (const box of candidates) {
    const regionText = textItemsInRegion(textContent, box, pageHeight);
    const metrics = scoreLabelRegion(imageData, viewport, box, pageWidth, pageHeight, regionText);
    scored.push({ box, ...metrics });
  }

  const selected = selectBestLabels(scored, pageArea, profile.labelsPerPage, barcodeRequired);
  const allowTightCrop = barcodeRequired;

  return selected.map((item) => {
    const refined = refineBoxToInk(imageData, viewport, item.box, pageWidth, pageHeight, margin, {
      allowTightCrop,
    });
    return {
      labelBox: refined,
      invoiceBox: findInvoiceBoxForLabel(refined, pageWidth, pageHeight, margin, settings),
      score: item.score,
    };
  });
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
  return density > CONTENT_DENSITY;
}

/** True when the crop region contains barcode-like ink patterns (AWB / QR strips). */
export async function regionHasBarcode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfPage: any,
  box: Box,
  pageWidth: number,
  pageHeight: number,
) {
  const { ctx, viewport } = await renderPage(pdfPage, 2);
  const rect = pdfBoxToCanvasRect(box, pageWidth, pageHeight, viewport);
  const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height);
  const { barcodeScore } = scoreRegionPixels(imageData, viewport.width, rect);
  return barcodeScore > 0;
}

/** Detect if an entire page is invoice-only, barcode-less, or blank — skip entirely. */
export async function isPageSkippable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfPage: any,
  pageWidth: number,
  pageHeight: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textContent: any,
) {
  const pageText = fullPageText(textContent, pageWidth, pageHeight);
  const hasInvoiceMarkers = INVOICE_ONLY_PATTERN.test(pageText);
  const hasLabelMarkers = LABEL_TEXT_PATTERN.test(pageText);

  if (hasInvoiceMarkers && !hasLabelMarkers) return true;

  const { ctx, viewport } = await renderPage(pdfPage, 1.5);
  const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height);
  const fullRect = { x: 0, y: 0, w: viewport.width, h: viewport.height };
  const { density, barcodeScore } = scoreRegionPixels(imageData, viewport.width, fullRect);

  if (density < BLANK_PAGE_DENSITY) return true;

  // Invoice / payment / seller-info fragments with no shipping barcode.
  if (barcodeScore === 0 && (hasInvoiceMarkers || !hasLabelMarkers)) {
    return true;
  }

  return false;
}

/**
 * Sample the first few pages of a PDF.js document and detect Amazon / Flipkart / Meesho.
 */
export async function detectPlatformFromPdfJs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfJsDoc: any,
  maxPages = 3,
) {
  if (!pdfJsDoc) return null;
  const pageCount = Math.min(pdfJsDoc.numPages ?? 0, maxPages);
  const chunks: string[] = [];

  for (let i = 1; i <= pageCount; i += 1) {
    const page = await pdfJsDoc.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    chunks.push(fullPageText(textContent, viewport.width, viewport.height));
  }

  return detectPlatformFromText(chunks.join("\n"));
}

export { shouldAutoDetectPlatform };
