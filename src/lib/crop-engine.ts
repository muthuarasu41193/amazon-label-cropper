import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import { resolveOutputSize } from "./label-presets";
import { applyPlatformLayoutToSettings, getPlatformLayout, rigidBoxesForPage, topSplitY } from "./platform-layouts";
import {
  detectPlatformFromPdfJs,
  isPageSkippable,
  regionHasBarcode,
  regionHasContent,
  regionLooksLikeInvoiceFragment,
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
/** Amazon packing line: short seller SKU + quantity (not the full product title). */
type LineItem = { sku: string; quantity: string };
type ProductDetails = {
  sku: string;
  quantity: string;
  /** Every invoice row when the tax invoice has multiple products */
  lineItems?: LineItem[];
} | null;

/** A4 page used by Amazon reference croppers so the left label can be enlarged ~2×. */
const AMAZON_OUTPUT_A4 = { width: 595.28, height: 841.89 };

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
    const qty = row.items.find((item) => /^qty\.?$/i.test(item.text) || /^quantity$/i.test(item.text));
    const unit = row.items.find((item) => /unit\s*price/i.test(item.text) || /^unit$/i.test(item.text));
    const hsn = row.items.find((item) => /^hsn$/i.test(item.text) || /hsn\s*code/i.test(item.text));

    if (description && (qty || unit)) {
      return {
        index: i,
        descriptionX: description.x,
        unitX: unit?.x ?? qty?.x ?? description.x + 220,
        qtyX: qty?.x ?? null,
        hsnX: hsn?.x ?? null,
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
    unitX: left + width * 0.62,
    qtyX: left + width * 0.48,
    hsnX: left + width * 0.38,
  };
}

function isDeclarationTableRow(text: string) {
  return (
    /\b(self declaration|item type|customer self)\b/i.test(text) ||
    /\b#\s*seller\s*gstin\b/i.test(text) ||
    (/\bgstin\b/i.test(text) && /\binvoice\b/i.test(text) && /\bdate\b/i.test(text) && !/description/i.test(text))
  );
}

function isRowIndexNotQty(row: ReturnType<typeof itemRows>[number], qty: string, header: NonNullable<ReturnType<typeof findHeader>>) {
  if (qty !== "1") return false;
  const indexItem = row.items.find((item) => item.text.trim() === qty);
  if (!indexItem) return false;
  if (indexItem.x < header.descriptionX + 25) {
    return !/[\d,]+\.\d{2}/.test(row.text) && !/\b\d{4,8}\b/.test(row.text);
  }
  return false;
}

/** Collect order quantities from the tax-invoice table, ignoring declaration # column. */
function findInvoiceQuantity(
  items: TextItem[],
  rows: ReturnType<typeof itemRows>,
  header: NonNullable<ReturnType<typeof findHeader>>,
) {
  const quantities: string[] = [];

  for (const row of rows.slice(Math.max(0, header.index + 1))) {
    if (/\b(total|subtotal|grand\s*total|amount in words|signature|authorized)\b/i.test(row.text)) break;
    if (isDeclarationTableRow(row.text)) continue;
    if (/\b(order number|order date|place of supply|place of delivery|bill to|ship to)\b/i.test(row.text)) continue;

    const rowQty = extractQtyFromRow(row, header);
    if (!rowQty || isRowIndexNotQty(row, rowQty, header)) continue;

    const hasPrice = /[\d,]+\.\d{2}/.test(row.text);
    const hasHsn = /\b\d{4,8}\b/.test(row.text);
    const hasDescription = row.items.some(
      (item) => item.x >= header.descriptionX - 8 && item.x < (header.hsnX ?? header.unitX) - 5 && item.text.trim().length > 2,
    );

    if (hasPrice || hasHsn || hasDescription) quantities.push(rowQty);
  }

  if (quantities.length === 1) return quantities[0];
  if (quantities.length > 1) {
    return String(quantities.reduce((sum, value) => sum + (Number(value) || 0), 0));
  }

  const blob = items.map((item) => item.text).join(" ");
  const labeled = blob.match(/\b(?:qty|quantity)\s*[.:\-]?\s*(\d{1,4})\b/i);
  if (labeled) return labeled[1];

  for (const row of rows) {
    if (isDeclarationTableRow(row.text)) continue;
    const match = row.text.match(/\b\d{4,8}\b\s+(\d{1,4})\s+(?:Rs\.?)?\s*[\d,]/);
    if (match && !isRowIndexNotQty(row, match[1], header)) return match[1];
  }

  return extractQuantityFromRowText(blob);
}

/** Read quantity from the Qty column or the HSN → Qty → Price pattern — never guess from random numbers. */
function extractQtyFromRow(row: ReturnType<typeof itemRows>[number], header: NonNullable<ReturnType<typeof findHeader>>) {
  if (header.qtyX !== null) {
    for (const item of row.items) {
      if (item.x >= header.qtyX - 30 && item.x <= header.qtyX + 80) {
        const value = item.text.trim();
        if (/^\d{1,4}$/.test(value)) return value;
      }
    }
  }

  const hsnStart = header.hsnX ?? header.descriptionX + (header.unitX - header.descriptionX) * 0.35;
  for (const item of row.items) {
    if (item.x >= hsnStart - 10 && item.x < header.unitX - 8) {
      const value = item.text.trim();
      if (/^\d{1,4}$/.test(value)) return value;
    }
  }

  const hsnQtyPrice = row.text.match(/\b\d{4,8}\b\s+(\d{1,4})\s+(?:Rs\.?)?\s*[\d,]/);
  if (hsnQtyPrice) return hsnQtyPrice[1];

  return "";
}

function isInvoiceLineRow(row: ReturnType<typeof itemRows>[number], header: NonNullable<ReturnType<typeof findHeader>>) {
  if (isDeclarationTableRow(row.text)) return false;
  const qty = extractQtyFromRow(row, header);
  if (!qty || isRowIndexNotQty(row, qty, header)) return false;
  const hasHsn = /\b\d{4,8}\b/.test(row.text);
  const hasPrice = /[\d,]+\.\d{2}/.test(row.text);
  return hasHsn || hasPrice;
}

function extractQuantityFromRowText(text: string) {
  const normalized = text.replace(/₹/g, "Rs.").replace(/\s+/g, " ").trim();
  const hsnQtyPrice = normalized.match(/\b\d{4,8}\b\s+(\d{1,4})\s+(?:Rs\.?)?\s*[\d,]/);
  if (hsnQtyPrice) return hsnQtyPrice[1];
  const priceThenQty = normalized.match(/(?:Rs\.)?\s*\d[\d,.]*\s+(\d{1,4})\s+(?:Rs\.|\d[\d,.]*)/i);
  if (priceThenQty) return priceThenQty[1];
  return "";
}

/**
 * Amazon invoice line format ends with ASIN + seller SKU in parentheses, e.g.
 * `... | B0GTW9WXXY ( 5KUNDANPEN )` — sometimes the closing `)` is on the next row.
 */
function extractAmazonSku(description: string) {
  const normalized = description.replace(/\s+/g, " ").trim();
  const withAsin = normalized.match(/B0[A-Z0-9]{8}\s*\(\s*([^)]+?)\s*\)/i);
  if (withAsin?.[1]) return withAsin[1].replace(/\)\s*$/, "").trim();
  const anyParen = normalized.match(/\(\s*([A-Za-z0-9][A-Za-z0-9 +_\-./]{1,48})\s*\)/);
  if (anyParen?.[1] && !/^B0[A-Z0-9]{8}$/i.test(anyParen[1])) {
    return anyParen[1].trim();
  }
  // Split across rows: `B0... (` on one line and `SKU )` on the next.
  const openAsin = normalized.match(/B0[A-Z0-9]{8}\s*\(\s*(.+)$/i);
  if (openAsin?.[1]) {
    return openAsin[1].replace(/\)\s*$/, "").trim();
  }
  return "";
}

/** @returns product details with every invoice line item preserved */
function parseProductDetailsFromItems(items: TextItem[]): ProductDetails {
  const rows = itemRows(items);
  const header = findHeader(rows) || fixedColumnHeader(items);
  if (!header) return null;

  const descriptionParts: string[] = [];
  const lineItems: LineItem[] = [];
  let pendingDescription: string[] = [];

  for (const row of rows.slice(Math.max(0, header.index + 1))) {
    if (/\b(total|subtotal|amount in words|signature|authorized)\b/i.test(row.text)) break;
    if (/\b(order number|order date|invoice|place of supply|place of delivery)\b/i.test(row.text)) continue;
    if (isDeclarationTableRow(row.text)) continue;

    const rawLine = row.items
      .filter((item) => item.x >= header.descriptionX - 4 && item.x < header.unitX - 4)
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (/^hsn\b/i.test(rawLine)) continue;

    const descriptionText = rawLine.replace(/\bHSN\b.*$/i, "").trim();
    if (descriptionText && !/^\d+$/.test(descriptionText)) {
      descriptionParts.push(descriptionText);
      pendingDescription.push(descriptionText);
    }

    const rowQty = extractQtyFromRow(row, header);
    if (rowQty && isInvoiceLineRow(row, header)) {
      const joined = pendingDescription.join(" ").replace(/\s+/g, " ").trim();
      const sku = extractAmazonSku(joined) || joined.slice(0, 48).trim();
      if (sku) {
        lineItems.push({ sku, quantity: rowQty });
      }
      pendingDescription = [];
    }
  }

  if (lineItems.length === 0) {
    // Fallback: ASIN+(seller SKU) blocks may span rows without a clear Qty column hit
    const asinBlocks = allAsinSellerSkus(descriptionParts.join(" "));
    if (asinBlocks.length > 0) {
      const quantities = findAllInvoiceQuantities(items, rows, header);
      for (let i = 0; i < asinBlocks.length; i += 1) {
        lineItems.push({
          sku: asinBlocks[i],
          quantity: quantities[i] || quantities[0] || "1",
        });
      }
    }
  }

  if (lineItems.length === 0) {
    const joinedDescription = descriptionParts.join(" ").replace(/\s+/g, " ").trim();
    const sku = extractAmazonSku(joinedDescription);
    const quantity = findInvoiceQuantity(items, rows, header);

    if (!sku && !quantity) return null;
    return { sku: sku || joinedDescription.slice(0, 48).trim(), quantity, lineItems: undefined };
  }

  if (lineItems.length === 1) {
    const quantity = lineItems[0].quantity || findInvoiceQuantity(items, rows, header);
    return { sku: lineItems[0].sku, quantity, lineItems };
  }

  const totalQuantity = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  return {
    sku: lineItems.map((item) => item.sku).join(" + "),
    quantity: String(totalQuantity),
    lineItems,
  };
}

/** Collect every Qty value from invoice rows (same filters as findInvoiceQuantity). */
function findAllInvoiceQuantities(
  items: TextItem[],
  rows: ReturnType<typeof itemRows>,
  header: NonNullable<ReturnType<typeof findHeader>>,
) {
  const quantities: string[] = [];

  for (const row of rows.slice(Math.max(0, header.index + 1))) {
    if (/\b(total|subtotal|grand\s*total|amount in words|signature|authorized)\b/i.test(row.text)) break;
    if (isDeclarationTableRow(row.text)) continue;
    if (/\b(order number|order date|place of supply|place of delivery|bill to|ship to)\b/i.test(row.text)) continue;

    const rowQty = extractQtyFromRow(row, header);
    if (!rowQty || isRowIndexNotQty(row, rowQty, header)) continue;

    const hasPrice = /[\d,]+\.\d{2}/.test(row.text);
    const hasHsn = /\b\d{4,8}\b/.test(row.text);
    const hasDescription = row.items.some(
      (item) => item.x >= header.descriptionX - 8 && item.x < (header.hsnX ?? header.unitX) - 5 && item.text.trim().length > 2,
    );

    if (hasPrice || hasHsn || hasDescription) quantities.push(rowQty);
  }

  return quantities;
}

/** Find every `B0... (sellerSku)` pair in invoice description text. */
function allAsinSellerSkus(description: string) {
  const skus: string[] = [];
  const re = /\bB0[A-Z0-9]{8}\b\s*\(\s*([^)]+?)\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(description)) !== null) {
    const sku = match[1].replace(/\s+/g, " ").trim();
    if (sku && !/^B0[A-Z0-9]{8}$/i.test(sku)) skus.push(sku);
  }
  return skus;
}

function isDetected(details: ProductDetails) {
  return Boolean(details?.sku || details?.quantity || details?.lineItems?.length);
}

/** One overlay line per product: `SKU | Qty - 1`. */
function formatAmazonSkuQtyLines(details: ProductDetails): string[] {
  if (!details) return [];

  if (details.lineItems && details.lineItems.length > 0) {
    return details.lineItems.map((item) => {
      const sku = makePdfTextSafe(item.sku || "").trim();
      const qty = makePdfTextSafe(item.quantity || "").trim() || "?";
      if (!sku) return `Qty - ${qty}`;
      return `${sku} | Qty - ${qty}`;
    });
  }

  const sku = makePdfTextSafe(details.sku || "").trim();
  const qty = makePdfTextSafe(details.quantity || "").trim();
  if (!sku && !qty) return [];
  if (!sku) return [`Qty - ${qty || "?"}`];
  return [`${sku} | Qty - ${qty || "?"}`];
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
    const pageWidth = sourcePages[pageIndex].getSize().width;

    for (const pair of allPairs[pageIndex]) {
      const normal = textItemsInBox(textContent, pair.invoiceBox, pageHeight, false);
      const flipped = textItemsInBox(textContent, pair.invoiceBox, pageHeight, true);
      let parsed = parseProductDetailsFromItems(normal) || parseProductDetailsFromItems(flipped);

      if (!parsed?.quantity) {
        const wideBox = {
          left: pageWidth * 0.47,
          bottom: pair.labelBox.bottom - 4,
          right: pageWidth,
          top: pair.labelBox.top + 4,
        };
        const wideNormal = textItemsInBox(textContent, wideBox, pageHeight, false);
        const wideFlipped = textItemsInBox(textContent, wideBox, pageHeight, true);
        const wideParsed = parseProductDetailsFromItems(wideNormal) || parseProductDetailsFromItems(wideFlipped);
        if (wideParsed) {
          parsed = {
            sku: parsed?.sku || wideParsed.sku,
            quantity: wideParsed.quantity || parsed?.quantity || "",
            lineItems:
              (wideParsed.lineItems && wideParsed.lineItems.length > 0
                ? wideParsed.lineItems
                : parsed?.lineItems) || undefined,
          };
        }
      }

      details.push(parsed || null);
    }
  }

  await loadingTask.destroy();
  return details;
}

/**
 * Amazon-only overlay matching reference croppers (`SKU | Qty - 1`).
 * Multi-item invoices get one line per product stacked upward from the anchor.
 */
function drawAmazonSkuQtyOverlay(
  page: PDFPage,
  details: ProductDetails,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  target: { width: number; height: number },
) {
  const lines = formatAmazonSkuQtyLines(details);
  if (!lines.length) return;

  const fontSize = Math.min(16, Math.max(11, target.width * 0.022));
  const maxWidth = target.width - 100;
  const x = Math.min(85, target.width * 0.14);
  const lineGap = fontSize + 4;
  // Reference success PDF places the first overlay around x≈85, y≈185 on A4.
  let y = Math.min(185, target.height * 0.22);

  // Stack additional items above the first so they stay in the label footer area.
  if (lines.length > 1) {
    y = Math.min(y + (lines.length - 1) * lineGap, target.height * 0.32);
  }

  for (const raw of lines) {
    const text = wrapText(raw, font, fontSize, maxWidth)[0] || raw;
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    y -= lineGap;
  }
}

function getAmazonOutputSize(labelWidth: number, labelHeight: number) {
  // Enlarge the left-column crop onto full A4 (~2×) like the reference cropper —
  // never shrink into a secondary product-info strip on a 4×6 page.
  const scale = Math.min(AMAZON_OUTPUT_A4.width / labelWidth, AMAZON_OUTPUT_A4.height / labelHeight);
  return {
    page: AMAZON_OUTPUT_A4,
    scale,
    drawWidth: labelWidth * scale,
    drawHeight: labelHeight * scale,
  };
}

/**
 * Fit a tight Flipkart/Meesho label crop onto 4×6 without clipping.
 * Uses contain (not cover) with a small margin on all sides so top/bottom
 * barcode bands stay visible while the label stays large.
 */
function fitLabelOnThermalPage(
  labelWidth: number,
  labelHeight: number,
  pageWidth: number,
  pageHeight: number,
  marginPt = 8,
) {
  const innerW = Math.max(1, pageWidth - marginPt * 2);
  const innerH = Math.max(1, pageHeight - marginPt * 2);
  const scale = Math.min(innerW / labelWidth, innerH / labelHeight);
  const drawWidth = labelWidth * scale;
  const drawHeight = labelHeight * scale;
  return {
    scale,
    drawWidth,
    drawHeight,
    x: (pageWidth - drawWidth) / 2,
    y: (pageHeight - drawHeight) / 2,
  };
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
  // Marketplace barcode / invoice checks always run when pdf.js is available,
  // even if "skip blank" is off — otherwise Sold By / logo panels leak through.
  const platformId = settings.platformId ?? "";
  const marketplace = isMarketplaceWithBarcodes(platformId);

  if (pdfJsDoc) {
    const pdfPage = await pdfJsDoc.getPage(pageIndex + 1);

    if (marketplace) {
      const textContent = await pdfPage.getTextContent();
      if (await regionLooksLikeInvoiceFragment(pdfPage, box, pageWidth, pageHeight, textContent)) {
        return true;
      }
      const hasBarcode = await regionHasBarcode(pdfPage, box, pageWidth, pageHeight);
      if (!hasBarcode) return true;
    }

    if (settings.skipBlank) {
      const hasContent = await regionHasContent(pdfPage, box, pageWidth, pageHeight);
      if (!hasContent) return true;
    }

    return false;
  }

  if (!settings.skipBlank) return false;

  const probePdf = await PDFDocument.create();
  const embedded = await probePdf.embedPage(sourcePdf.getPages()[pageIndex], box);
  const page = probePdf.addPage([embedded.width, embedded.height]);
  page.drawPage(embedded, { x: 0, y: 0 });
  const bytes = await probePdf.save({ useObjectStreams: false });
  return bytes.length < 1400;
}

function isMarketplaceWithBarcodes(platformId?: string) {
  return platformId === "amazon" || platformId === "flipkart" || platformId === "meesho";
}

async function resolvePagePairs(
  sourcePages: PDFPage[],
  settings: CropSettings,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfJsDoc: any,
  onProgress?: (progress: CropProgress) => void,
) {
  const allPairs: Pair[][] = [];
  const marketplace = isMarketplaceWithBarcodes(settings.platformId);

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

      // Skip invoice-only / barcode-less / blank pages entirely.
      if (await isPageSkippable(pdfPage, width, height, textContent)) {
        allPairs.push([]);
        continue;
      }

      // Always prefer content scan for marketplaces — rigid fallback emits Sold By panels.
      if (settings.smartScan || marketplace) {
        const detected = await scanPageForLabels(pdfPage, width, height, textContent, settings);
        if (detected.length > 0) {
          allPairs.push(detected);
          continue;
        }
        // No barcode-backed labels on this page — skip it for marketplaces.
        if (marketplace) {
          allPairs.push([]);
          continue;
        }
      }
    }

    if (marketplace) {
      allPairs.push([]);
      continue;
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

  const isAmazon = effectiveSettings.platformId === "amazon";
  const showAmazonSkuOverlay = isAmazon && effectiveSettings.includeInvoiceText;

  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const pairs = allPairs[pageIndex];
    const { width, height } = sourcePages[pageIndex].getSize();

    for (const pair of pairs) {
      const details = productDetails[detailsIndex] || null;
      detailsIndex += 1;

      if (await looksBlank(sourcePdf, pdfJsDoc, pageIndex, pair.labelBox, effectiveSettings, width, height)) continue;

      const label = await outputPdf.embedPage(sourcePages[pageIndex], pair.labelBox);

      // Amazon: enlarge left-column crop onto full A4 and overlay compact SKU|Qty —
      // never reserve a product-info strip that shrinks the shipping label.
      if (isAmazon) {
        const amazon = getAmazonOutputSize(label.width, label.height);
        const page = outputPdf.addPage([amazon.page.width, amazon.page.height]);
        page.drawRectangle({
          x: 0,
          y: 0,
          width: amazon.page.width,
          height: amazon.page.height,
          color: rgb(1, 1, 1),
        });
        page.drawPage(label, {
          x: (amazon.page.width - amazon.drawWidth) / 2,
          y: (amazon.page.height - amazon.drawHeight) / 2,
          width: amazon.drawWidth,
          height: amazon.drawHeight,
        });
        if (showAmazonSkuOverlay && isDetected(details)) {
          drawAmazonSkuQtyOverlay(page, details, textFont, amazon.page);
        }
        labelsAdded += 1;
        continue;
      }

      // Flipkart / Meesho: crop is a tight label band — fit onto 4×6 with margins
      // (contain, not cover) so top/bottom sections are not clipped.
      const isTopMarketplace =
        effectiveSettings.platformId === "flipkart" || effectiveSettings.platformId === "meesho";
      const target = isTopMarketplace
        ? getOutputSize(label.width, label.height, { ...effectiveSettings, pageSize: "4x6" })
        : getOutputSize(label.width, label.height, effectiveSettings);
      const page = outputPdf.addPage([target.width, target.height]);

      page.drawRectangle({ x: 0, y: 0, width: target.width, height: target.height, color: rgb(1, 1, 1) });

      if (isTopMarketplace) {
        const fitted = fitLabelOnThermalPage(label.width, label.height, target.width, target.height, 10);
        page.drawPage(label, {
          x: fitted.x,
          y: fitted.y,
          width: fitted.drawWidth,
          height: fitted.drawHeight,
        });
      } else {
        const scale =
          effectiveSettings.fitMode === "cover"
            ? Math.max(target.width / label.width, target.height / label.height)
            : Math.min(target.width / label.width, target.height / label.height);
        const drawWidth = label.width * scale;
        const drawHeight = label.height * scale;

        page.drawPage(label, {
          x: (target.width - drawWidth) / 2,
          y: (target.height - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
      }

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
