/**
 * Content-based shipping label detection.
 * Renders each PDF page and scores candidate regions by ink density,
 * barcode-like patterns, and shipping-related text keywords.
 */

const LABEL_TEXT_PATTERN =
  /\b(ship\s*to|ship\s*from|deliver\s*to|shipment|tracking|awb|fba|amazon|courier|consignee|pickup|order\s*(?:id|no|number)|shipment\s*id|carrier|destination|return\s*to|sold\s*by|fulfillment|waybill|barcode|dispatch|consignment)\b/i;

const INVOICE_TEXT_PATTERN =
  /\b(description|invoice|tax\s*invoice|qty|quantity|unit\s*price|hsn|gst|subtotal|amount|bill\s*to)\b/i;

function pdfBoxToCanvasRect(box, pageWidth, pageHeight, viewport) {
  const x = (box.left / pageWidth) * viewport.width;
  const y = ((pageHeight - box.top) / pageHeight) * viewport.height;
  const w = ((box.right - box.left) / pageWidth) * viewport.width;
  const h = ((box.top - box.bottom) / pageHeight) * viewport.height;
  return { x, y, w, h };
}

function textItemsInRegion(textContent, box, pageHeight) {
  const results = [];
  for (const flipY of [false, true]) {
    for (const item of textContent.items) {
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

function boxArea(box) {
  return Math.max(0, box.right - box.left) * Math.max(0, box.top - box.bottom);
}

function boxOverlapRatio(a, b) {
  const overlapLeft = Math.max(a.left, b.left);
  const overlapRight = Math.min(a.right, b.right);
  const overlapBottom = Math.max(a.bottom, b.bottom);
  const overlapTop = Math.min(a.top, b.top);
  if (overlapRight <= overlapLeft || overlapTop <= overlapBottom) return 0;
  const overlapArea = (overlapRight - overlapLeft) * (overlapTop - overlapBottom);
  return overlapArea / Math.min(boxArea(a), boxArea(b));
}

function dedupeBoxes(boxes, overlapThreshold = 0.7) {
  const kept = [];
  for (const box of boxes) {
    const duplicate = kept.some((existing) => boxOverlapRatio(existing, box) > overlapThreshold);
    if (!duplicate) kept.push(box);
  }
  return kept;
}

function scoreRegionPixels(imageData, canvasWidth, rect) {
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

function generateCandidateBoxes(pageWidth, pageHeight, settings) {
  const margin = Math.min(pageWidth, pageHeight) * (Number(settings.marginPercent) / 100);
  const candidates = [];

  const colWidths = [0.42, 0.48, 0.52, 0.55];
  const rowHeights = [0.4, 0.46, 0.5];
  const colStarts = [0, 0.02, 0.48, 0.5, 0.52];
  const rowStarts = [0, 0.02, 0.48, 0.5, 0.52];

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

  const halfW = pageWidth * (Number(settings.leftPercent) / 100);
  const halfH = pageHeight / 2;

  const presetBoxes = [
    { left: margin, bottom: halfH + margin, right: halfW - margin, top: pageHeight - margin },
    { left: margin, bottom: margin, right: halfW - margin, top: halfH - margin },
    { left: pageWidth - halfW + margin, bottom: halfH + margin, right: pageWidth - margin, top: pageHeight - margin },
    { left: pageWidth - halfW + margin, bottom: margin, right: pageWidth - margin, top: halfH - margin },
    { left: margin, bottom: halfH + margin, right: pageWidth - margin, top: pageHeight - margin },
    { left: margin, bottom: margin, right: pageWidth - margin, top: halfH - margin },
    { left: margin, bottom: margin, right: halfW - margin, top: halfH - margin },
    { left: halfW + margin, bottom: margin, right: pageWidth - margin, top: halfH - margin },
  ];

  candidates.push(...presetBoxes);
  return dedupeBoxes(candidates, 0.65);
}

function findInvoiceBoxForLabel(labelBox, pageWidth, pageHeight, margin) {
  const centerX = (labelBox.left + labelBox.right) / 2;
  const isLeft = centerX < pageWidth * 0.45;

  if (isLeft) {
    return {
      left: pageWidth * 0.48 + margin,
      bottom: labelBox.bottom - margin,
      right: pageWidth - margin,
      top: labelBox.top + margin,
    };
  }

  return {
    left: margin,
    bottom: labelBox.bottom - margin,
    right: pageWidth * 0.52 - margin,
    top: labelBox.top + margin,
  };
}

function selectBestLabels(scored, pageArea) {
  const minScore = 0.14;
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const selected = [];

  for (const candidate of sorted) {
    if (candidate.score < minScore) continue;

    const areaRatio = boxArea(candidate.box) / pageArea;
    if (areaRatio > 0.7 || areaRatio < 0.06) continue;

    const overlaps = selected.some((s) => boxOverlapRatio(s.box, candidate.box) > 0.38);
    if (!overlaps) selected.push(candidate);
  }

  selected.sort((a, b) => {
    const aCenterY = (a.box.bottom + a.box.top) / 2;
    const bCenterY = (b.box.bottom + b.box.top) / 2;
    if (Math.abs(aCenterY - bCenterY) > 20) return bCenterY - aCenterY;
    return a.box.left - b.box.left;
  });

  return selected;
}

async function renderPage(pdfPage, scale = 2) {
  const viewport = pdfPage.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  return { canvas, ctx, viewport };
}

/**
 * Scan a single PDF page and return detected label regions with paired invoice boxes.
 * @returns {Promise<Array<{ labelBox: object, invoiceBox: object, score: number }>>}
 */
export async function scanPageForLabels(pdfPage, pageWidth, pageHeight, textContent, settings) {
  const { ctx, viewport } = await renderPage(pdfPage, 2);
  const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height);
  const pageArea = pageWidth * pageHeight;
  const margin = Math.min(pageWidth, pageHeight) * (Number(settings.marginPercent) / 100);

  const candidates = generateCandidateBoxes(pageWidth, pageHeight, settings);
  const scored = [];

  for (const box of candidates) {
    const rect = pdfBoxToCanvasRect(box, pageWidth, pageHeight, viewport);
    const { density, barcodeScore } = scoreRegionPixels(imageData, viewport.width, rect);

    const regionText = textItemsInRegion(textContent, box, pageHeight);
    const textScore = LABEL_TEXT_PATTERN.test(regionText) ? 0.35 : 0;
    const invoicePenalty = INVOICE_TEXT_PATTERN.test(regionText) && !LABEL_TEXT_PATTERN.test(regionText) ? -0.2 : 0;

    const areaRatio = boxArea(box) / pageArea;
    const sizePenalty = areaRatio > 0.65 ? -0.4 : areaRatio < 0.07 ? -0.25 : 0;

    const score = density * 0.45 + barcodeScore + textScore + invoicePenalty + sizePenalty;
    scored.push({ box, score, density });
  }

  let selected = selectBestLabels(scored, pageArea);

  if (selected.length === 0) {
    const fallback = scored.filter((s) => s.density > 0.04).sort((a, b) => b.density - a.density).slice(0, 2);
    selected = fallback;
  }

  return selected.map((item) => ({
    labelBox: item.box,
    invoiceBox: findInvoiceBoxForLabel(item.box, pageWidth, pageHeight, margin),
    score: item.score,
  }));
}

/**
 * Pixel-based blank check — more reliable than PDF byte-size heuristic.
 */
export async function regionHasContent(pdfPage, box, pageWidth, pageHeight) {
  const { ctx, viewport } = await renderPage(pdfPage, 1.5);
  const rect = pdfBoxToCanvasRect(box, pageWidth, pageHeight, viewport);
  const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height);
  const { density } = scoreRegionPixels(imageData, viewport.width, rect);
  return density > 0.018;
}
