/**
 * Extract dispatch-manifest rows from Amazon, Meesho, and Flipkart shipping-label PDFs.
 * Runs entirely in the browser via PDF.js.
 */
import * as pdfjs from "pdfjs-dist";
import { initPdfJsWorker } from "./crop-engine";

type PdfGlyph = { text: string; x: number; y: number };
type Box = { left: number; bottom: number; right: number; top: number };

export type Shipment = {
  platform: string;
  orderId: string;
  awb: string;
  customer: string;
  city: string;
  pin: string;
  quantity: string;
  payment: string;
  amount: string;
  sku: string;
  product: string;
  courier: string;
  shipDate: string;
};

export type SkuDetails = {
  platform: string;
  sku: string;
  skus: string[];
  asin: string;
  fsn: string;
  fnsku: string;
  productId: string;
};

export type SkuCount = {
  sku: string;
  quantity: number;
};

const SKU_LABELED =
  /(?:seller\s*sku|sku[\s\r\n]*id|supplier\s*sku|product\s*sku|\bsku)\s*[:.\-]*\s*[\r\n]*\s*([A-Z0-9][A-Z0-9_\-./]{1,47})/gi;

const AMAZON_ORDER = /\b(\d{3}-\d{7}-\d{7})\b/;
const FLIPKART_ORDER = /\b(OD\d{14,22})\b/i;
const LABELED_ORDER =
  /(?:sub\s*order|supplier\s*order|packet(?:\s*id)?|order)\s*(?:id|no\.?|number|#)?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9-]{7,})/i;
const AWB_LABEL =
  /(?:tracking\s*(?:id|no\.?|number|#)?|awb(?:\s*(?:no\.?|number|#|id))?|consignment(?:\s*(?:no\.?|id|number))?|airway\s*bill|shipment\s*(?:id|no\.?))\s*[:.\-]?\s*([A-Z0-9]{8,})/i;
const PIN_LABEL = /(?:pin\s*code|pincode|postal\s*code|pin)\s*[:.\-]?\s*(\d{6})\b/i;
const QTY_LABEL = /(?:\bqty\b|\bquantity\b|no\.?\s*of\s*(?:items|pcs|pieces))\s*[:.\-]?\s*(\d{1,4})\b/i;
const AMOUNT_LABEL =
  /(?:cod(?:\s*amount)?|collectable(?:\s*amount)?|collect(?:\s*amount)?|to\s*collect|grand\s*total)\s*[:.\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;
const DATE_LABEL =
  /(?:ship(?:ping)?\s*date|dispatch\s*date|order\s*date)\s*[:.\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i;
const CUSTOMER_LABEL =
  /(?:ship\s*to|deliver(?:y)?\s*to|consignee|customer(?:\s*name)?|receiver)\s*[:.\-]?\s*([A-Za-z][A-Za-z .']{2,48})/i;
const CITY_LABEL = /(?:\bcity\b|\bdestination\b)\s*[:.\-]?\s*([A-Za-z][A-Za-z ]{2,32})/i;
const COURIER_NAMES =
  /\b(Delhivery|Ekart|eKart|Amazon Shipping|ATS|ATSPL|Shadowfax|Xpressbees|Ecom Express|Blue Dart|DTDC|India Post|Meesho Logistics|Valmo)\b/i;

function normalizeSpace(text: string) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstCapture(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[1] ? normalizeSpace(match[1]) : "";
}

export function detectPlatform(text: string) {
  const blob = String(text || "");
  const lower = blob.toLowerCase();

  if (AMAZON_ORDER.test(blob) || /\bamazon\.in\b|\bsold on:\s*www\.amazon|\batspl\b/.test(lower)) {
    return "amazon";
  }
  if (/\bmeesho\b/.test(lower)) return "meesho";
  if (/\bflipkart\b|\bekart\b/.test(lower) || FLIPKART_ORDER.test(blob)) return "flipkart";
  return "unknown";
}

function extractOrderId(text: string, platform: string) {
  if (platform === "amazon" || AMAZON_ORDER.test(text)) {
    const amazon = firstCapture(text, AMAZON_ORDER);
    if (amazon) return amazon;
  }
  if (platform === "flipkart" || FLIPKART_ORDER.test(text)) {
    const flipkart = firstCapture(text, FLIPKART_ORDER);
    if (flipkart) return flipkart.toUpperCase();
  }
  const labeled = firstCapture(text, LABELED_ORDER);
  if (labeled && !/^(order|id|number|no)$/i.test(labeled)) return labeled;
  return "";
}

function extractAwb(text: string, orderId: string) {
  const labeled = firstCapture(text, AWB_LABEL);
  if (labeled && labeled !== orderId && !AMAZON_ORDER.test(labeled) && !FLIPKART_ORDER.test(labeled)) {
    return labeled;
  }

  const candidates = [...text.matchAll(/\b([A-Z0-9]{10,18})\b/g)]
    .map((match) => match[1])
    .filter((value) => {
      if (value === orderId) return false;
      if (AMAZON_ORDER.test(value) || FLIPKART_ORDER.test(value)) return false;
      if (/^\d{6}$/.test(value)) return false;
      if (/^B0[A-Z0-9]{8}$/i.test(value)) return false;
      if (/^\d{15}$/.test(value)) return false; // GSTIN-length numeric noise
      return /[A-Z]/i.test(value) || /^\d{11,14}$/.test(value);
    });

  return candidates[0] || "";
}

function extractPin(text: string) {
  const labeled = firstCapture(text, PIN_LABEL);
  if (labeled) return labeled;

  const pins = [...text.matchAll(/\b(\d{6})\b/g)].map((match) => match[1]);
  return pins.find((pin) => !/^0{2,}/.test(pin)) || "";
}

function extractQuantity(text: string) {
  const labeled = firstCapture(text, QTY_LABEL);
  if (labeled && Number(labeled) > 0 && Number(labeled) < 500) return labeled;
  return "";
}

/** Pieces for one label/region. Blank or unreadable qty counts as 1. */
export function parseQuantity(text: string): number {
  const labeled = firstCapture(
    text,
    /(?:\bqty\b|\bquantity\b|\bpcs\b|\bpieces\b|no\.?\s*of\s*(?:items|pcs|pieces))\s*[:.\-]?\s*(\d{1,4})\b/i,
  );
  const n = Number(labeled);
  if (n > 0 && n < 500) return n;
  return 1;
}

function extractPayment(text: string) {
  if (/\bcash\s*on\s*delivery\b|\bcod\b|\bcollectable\b/i.test(text)) return "COD";
  if (/\bpre[-\s]?paid\b|\bprepaid\b|\bpaid\b/i.test(text)) return "Prepaid";
  return "";
}

function extractAmount(text: string) {
  const labeled = firstCapture(text, AMOUNT_LABEL);
  if (labeled) return labeled.replace(/,/g, "");
  return "";
}

function extractCustomer(text: string) {
  return firstCapture(text, CUSTOMER_LABEL).replace(/\b(name|address)\b/gi, "").trim();
}

function extractCity(text: string, pin: string) {
  const labeled = firstCapture(text, CITY_LABEL);
  if (labeled && !/^(city|destination)$/i.test(labeled)) return labeled;

  if (pin) {
    const beforePin = text.match(new RegExp(`([A-Za-z][A-Za-z .]{2,32})\\s*[,\\-]?\\s*${pin}`));
    if (beforePin?.[1]) {
      const city = normalizeSpace(beforePin[1].replace(/\b(tamil nadu|karnataka|maharashtra|india|state)\b/gi, ""));
      if (city.length >= 3) return city;
    }
  }

  return "";
}

function extractProduct(text: string, sku = "") {
  return (
    text
      .split(/\n/)
      .map((entry: string) => normalizeSpace(entry))
      .find((entry: string) => {
        if (entry.length < 8 || entry.length > 80) return false;
        if (sku && entry.toLowerCase() === sku.toLowerCase()) return false;
        if (
          /order|awb|tracking|gstin|invoice|ship to|sold on|qty|quantity|pin|cod|prepaid|amount|rs\.|inr|flipkart|amazon|meesho|courier|pincode|consignee|customer|sku/i.test(
            entry,
          )
        ) {
          return false;
        }
        return /[A-Za-z]{3,}/.test(entry) && !/^\d+$/.test(entry);
      }) || ""
  );
}

function extractCourier(text: string) {
  const named = text.match(COURIER_NAMES);
  if (named?.[1]) return named[1];
  return firstCapture(text, /(?:courier|logistics|shipping\s*partner)\s*[:.\-]?\s*([A-Za-z][A-Za-z ]{2,28})/i);
}

const SKU_NOISE =
  /^(order|id|sku|seller|qty|cod|pin|awb|gstin|hsn|india|amazon|meesho|flipkart|ekart|paid|prepaid|invoice|date|type|description)$/i;

function cleanSkuToken(value: string) {
  return String(value || "")
    .replace(/[|[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,;:]+$/g, "");
}

function isNoiseSku(value: string) {
  const sku = cleanSkuToken(value);
  if (!sku || sku.length < 3 || sku.length > 48) return true;
  if (SKU_NOISE.test(sku)) return true;
  if (/^\d{6}$/.test(sku)) return true;
  if (/^\d{10}$/.test(sku)) return true;
  if (/^\d{4}$/.test(sku)) return true;
  if (AMAZON_ORDER.test(sku) || FLIPKART_ORDER.test(sku)) return true;
  if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/i.test(sku)) return true;
  if (/^(qty|quantity|hsn|gstin|description)$/i.test(sku)) return true;
  if (/^\d{8,}$/.test(sku)) return true;
  return false;
}

function uniqueSkus(values: string[]) {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const value of values) {
    const sku = cleanSkuToken(value);
    if (isNoiseSku(sku)) continue;
    const key = sku.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(sku);
  }
  return list;
}

function labeledSkus(text: string) {
  return [...text.matchAll(SKU_LABELED)].map((match) => match[1]);
}

function amazonSkus(text: string) {
  const found: string[] = [];
  const asinParen = [...text.matchAll(/B0[A-Z0-9]{8}\s*\(\s*([^)]{2,48}?)\s*\)/gi)];
  for (const match of asinParen) found.push(match[1]);
  found.push(...labeledSkus(text));
  return uniqueSkus(found);
}

function meeshoSkus(text: string) {
  return uniqueSkus(labeledSkus(text));
}

function isValidFlipkartSellerSku(value: string) {
  const sku = cleanSkuToken(value);
  if (isNoiseSku(sku) || isMarketplaceId(sku)) return false;
  if (/^(description|sku|qty|quantity|sold|gstin|hsn|invoice|flipkart|ekart)$/i.test(sku)) return false;
  if (/^\d+$/.test(sku) || sku.length > 40) return false;
  if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]/i.test(sku)) return false;
  // Seller SKUs look like Stones_B7000_Pen — not a plain word from the description.
  return /[A-Za-z]/.test(sku) && /[0-9_-]/.test(sku);
}

/** Flipkart table is `SKU ID | Description` then `Stones_B7000_Pen | product name`. */
function flipkartPipeSkuTokens(text: string): string[] {
  const blob = normalizeLabelText(text);
  const tokens: string[] = [];
  const pattern =
    /([A-Za-z][A-Za-z0-9._-]{2,47})\s*(?:\||│|¦)\s*(?!description\b)([A-Za-z][^\n|]{5,})/gi;
  for (const match of blob.matchAll(pattern)) {
    const sku = match[1];
    const desc = String(match[2] || "").trim();
    if (/^description$/i.test(desc)) continue;
    if (!isValidFlipkartSellerSku(sku)) continue;
    tokens.push(cleanSkuToken(sku));
  }
  return tokens;
}

function flipkartTableSkuTokens(text: string): string[] {
  const lines = normalizeLabelText(text)
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const tokens: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/sku[\s\r\n]*id/i.test(lines[i]) || !/description/i.test(lines[i])) continue;
    const data = lines[i + 1] || "";
    const pipe = data.match(/^([A-Za-z][A-Za-z0-9._-]{2,47})\s*(?:\||│|¦)/);
    const first = data.match(/^([A-Za-z][A-Za-z0-9._-]{2,47})(?:\s+|$)/);
    const sku = pipe?.[1] || first?.[1] || "";
    if (isValidFlipkartSellerSku(sku)) tokens.push(cleanSkuToken(sku));
  }
  return tokens;
}

function flipkartSkus(text: string) {
  const fromTable = flipkartTableSkuTokens(text);
  if (fromTable.length) return uniqueSkus(fromTable);
  return uniqueSkus(flipkartPipeSkuTokens(text));
}

function flipkartLabelSkuCounts(text: string): SkuCount[] {
  const fromTable = flipkartTableSkuTokens(text);
  const tokens = fromTable.length ? fromTable : flipkartPipeSkuTokens(text);
  return tokens.filter((sku) => isValidFlipkartSellerSku(sku)).map((sku) => ({ sku, quantity: 1 }));
}

function genericSkus(text: string) {
  const found: string[] = labeledSkus(text);
  for (const match of text.matchAll(/\b([A-Z]{2,}[A-Z0-9]*[-_][A-Z0-9][-_A-Z0-9]{0,32})\b/gi)) {
    found.push(match[1]);
  }
  return uniqueSkus(found);
}

/**
 * Pull seller SKU / product IDs from OCR or PDF text for Amazon, Meesho, and Flipkart labels.
 * @returns {{ platform: string, sku: string, skus: string[], asin: string, fsn: string, fnsku: string, productId: string }}
 */
function normalizeLabelText(text: string) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\b5KU\b/gi, "SKU")
    .replace(/\bSK0\b/gi, "SKU")
    .replace(/\b5eller\b/gi, "Seller")
    .replace(/\bSKUID\b/gi, "SKU ID")
    .replace(/\bSKU[\s-]*ID\b/gi, "SKU ID");
}

function isMarketplaceId(sku: string) {
  return /^B0[A-Z0-9]{8}$/i.test(sku) || /^X00/i.test(sku) || /^[A-Z]{4}[A-Z0-9]{12}$/.test(sku);
}

export function extractSkuDetails(text: string, platformHint = "auto"): SkuDetails {
  const blob = normalizeLabelText(text);
  const platform = platformHint !== "auto" && platformHint !== "unknown" ? platformHint : detectPlatform(blob);

  const asin = firstCapture(blob, /\b(B0[A-Z0-9]{8})\b/i).toUpperCase();
  const fnsku = firstCapture(blob, /\b(X00[A-Z0-9]{7,10})\b/i).toUpperCase();
  const fsn = firstCapture(blob, /\bFSN\s*[:.\-]?\s*([A-Z0-9]{10,16})\b/i).toUpperCase()
    || (blob.match(/\b([A-Z]{4}[A-Z0-9]{12})\b/) || [])[1]
    || "";
  const productId = firstCapture(blob, /(?:product\s*id|catalog\s*id)\s*[:.\-]?\s*(\d{6,14})/i);

  let skus: string[] = [];
  if (platform === "amazon") skus = amazonSkus(blob);
  else if (platform === "meesho") skus = meeshoSkus(blob);
  else if (platform === "flipkart") skus = flipkartSkus(blob);
  else skus = [...amazonSkus(blob), ...meeshoSkus(blob), ...flipkartSkus(blob), ...genericSkus(blob)];

  if (!skus.length && platform !== "flipkart") skus = genericSkus(blob);

  const sku = skus.find((value) => !isMarketplaceId(value)) || skus[0] || "";

  return {
    platform: platform === "unknown" ? "" : platform,
    sku,
    skus: platform === "flipkart" ? uniqueSkus([sku, ...skus].filter(Boolean)) : uniqueSkus([sku, ...skus, asin, fnsku, fsn, productId].filter(Boolean)),
    asin,
    fsn: cleanSkuToken(fsn),
    fnsku,
    productId,
  };
}

export function emptyShipment(): Shipment {
  return {
    platform: "",
    orderId: "",
    awb: "",
    customer: "",
    city: "",
    pin: "",
    quantity: "",
    payment: "",
    amount: "",
    sku: "",
    product: "",
    courier: "",
    shipDate: "",
  };
}

export function parseShipmentText(text: string, platformHint = "auto"): Shipment | null {
  const blob = String(text || "").replace(/\u00a0/g, " ");
  const skuInfo = extractSkuDetails(blob, platformHint);
  const platform = platformHint !== "auto" && platformHint !== "unknown" ? platformHint : skuInfo.platform || detectPlatform(blob);
  const orderId = extractOrderId(blob, platform);
  const awb = extractAwb(blob, orderId);
  const pin = extractPin(blob);
  const sku = skuInfo.sku;
  const product = extractProduct(blob, sku);

  const shipment = {
    ...emptyShipment(),
    platform: platform === "unknown" ? "" : platform,
    orderId,
    awb,
    customer: extractCustomer(blob),
    city: extractCity(blob, pin),
    pin,
    quantity: extractQuantity(blob),
    payment: extractPayment(blob),
    amount: extractAmount(blob),
    sku,
    product: product && product !== sku ? product : sku || product,
    courier: extractCourier(blob),
    shipDate: firstCapture(blob, DATE_LABEL),
  };

  if (!shipment.orderId && !shipment.awb && !shipment.sku) return null;
  return shipment;
}

function itemRows(items: PdfGlyph[]) {
  const rows: { y: number; items: PdfGlyph[] }[] = [];
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
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

function textItemsFromContent(textContent: { items: unknown[] }, pageHeight: number, flipY = false): PdfGlyph[] {
  return textContent.items.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || !("transform" in raw)) return [];
    const item = raw as { str?: string; transform?: number[] };
    if (!Array.isArray(item.transform)) return [];
    const rawY = item.transform[5];
    const text = String(item.str || "");
    if (!text.trim()) return [];
    return [
      {
        text,
        x: item.transform[4],
        y: flipY ? pageHeight - rawY : rawY,
      },
    ];
  });
}

function itemsInBox(items: PdfGlyph[], box: Box) {
  return items.filter(
    (item: PdfGlyph) => item.x >= box.left && item.x <= box.right && item.y >= box.bottom && item.y <= box.top,
  );
}

function pageBoxes(width: number, height: number) {
  const midX = width / 2;
  const midY = height / 2;
  return [
    { left: 0, bottom: midY, right: midX, top: height },
    { left: 0, bottom: 0, right: midX, top: midY },
    { left: midX, bottom: midY, right: width, top: height },
    { left: midX, bottom: 0, right: width, top: midY },
  ];
}

function shipmentsFromItems(items: PdfGlyph[], width: number, height: number, platformHint: string) {
  const found: Shipment[] = [];

  for (const box of pageBoxes(width, height)) {
    const regionText = itemRows(itemsInBox(items, box));
    if (regionText.length < 20) continue;
    const parsed = parseShipmentText(regionText, platformHint);
    if (parsed) found.push(parsed);
  }

  if (found.length) return found;

  const full = parseShipmentText(itemRows(items), platformHint);
  return full ? [full] : [];
}

function mergeField(current: string, next: string) {
  if (!current) return next || "";
  if (!next) return current;
  return next.length > current.length ? next : current;
}

export function mergeShipments(list: Shipment[]) {
  const merged: Shipment[] = [];

  for (const shipment of list) {
    if (!shipment) continue;
    const keys = [shipment.orderId, shipment.awb].filter(Boolean);
    const existing = merged.find((row) => keys.some((key) => key === row.orderId || key === row.awb));

    if (!existing) {
      merged.push({ ...shipment });
      continue;
    }

    for (const field of Object.keys(existing) as (keyof Shipment)[]) {
      existing[field] = mergeField(existing[field], shipment[field]);
    }
  }

  return merged;
}

export async function extractShipmentsFromPdf(
  file: File,
  options: {
    platformHint?: string;
    onProgress?: (progress: { file?: string; page?: number; total?: number; percent?: number }) => void;
  } = {},
) {
  const { platformHint = "auto", onProgress } = options;
  initPdfJsWorker();
  const bytes = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const collected: Shipment[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const normal = textItemsFromContent(textContent, viewport.height, false);
    const flipped = textItemsFromContent(textContent, viewport.height, true);

    const normalFound = shipmentsFromItems(normal, viewport.width, viewport.height, platformHint);
    const flippedFound = shipmentsFromItems(flipped, viewport.width, viewport.height, platformHint);
    collected.push(...(normalFound.length >= flippedFound.length ? normalFound : flippedFound));

    onProgress?.({
      file: file.name,
      page: pageIndex,
      total: pdf.numPages,
      percent: Math.round((pageIndex / pdf.numPages) * 100),
    });
  }

  await pdf.destroy();
  return mergeShipments(collected);
}

function amazonInvoiceSkuCounts(text: string): SkuCount[] {
  const skus = uniqueSkus(
    [...text.matchAll(/B0[A-Z0-9]{8}\s*\(\s*([^)]{2,48}?)\s*\)/gi)].map((match) => match[1]),
  ).filter((sku) => !isMarketplaceId(sku));
  if (!skus.length) return [];

  const qtys = [...text.matchAll(/\b\d{4,8}\b\s+(\d{1,4})\s+(?:Rs\.?|INR|[\d,]+\.\d{2})/gi)]
    .map((match) => Number(match[1]))
    .filter((n) => n > 0 && n < 500);

  if (skus.length === 1) {
    return [{ sku: skus[0], quantity: qtys[0] || parseQuantity(text) }];
  }
  return skus.map((sku, index) => ({ sku, quantity: qtys[index] || 1 }));
}

export function emptySkuCount(): SkuCount {
  return { sku: "", quantity: 1 };
}

export function skuCountsFromText(text: string, platformHint = "auto"): SkuCount[] {
  const blob = normalizeLabelText(text);
  const platform =
    platformHint !== "auto" && platformHint !== "unknown" ? platformHint : detectPlatform(blob);

  if (platform === "flipkart") return flipkartLabelSkuCounts(blob);

  if (platform === "amazon" || platformHint === "auto") {
    const invoice = amazonInvoiceSkuCounts(blob);
    if (invoice.length) return invoice.map((row) => ({ ...row, quantity: 1 }));
  }

  const details = extractSkuDetails(blob, platformHint);
  if (!details.sku || isMarketplaceId(details.sku)) return [];
  return [{ sku: details.sku, quantity: 1 }];
}

function skuCountsFromItems(items: PdfGlyph[], width: number, height: number, platformHint: string): SkuCount[] {
  const fullText = itemRows(items);
  if (platformHint === "flipkart" || detectPlatform(fullText) === "flipkart") {
    return flipkartLabelSkuCounts(fullText);
  }

  if ((platformHint === "amazon" || platformHint === "auto") && /B0[A-Z0-9]{8}\s*\(/i.test(fullText)) {
    const invoice = amazonInvoiceSkuCounts(fullText);
    if (invoice.length) return invoice.map((row) => ({ ...row, quantity: 1 }));
  }

  const regions: SkuCount[] = [];
  for (const box of pageBoxes(width, height)) {
    const regionText = itemRows(itemsInBox(items, box));
    if (regionText.length < 12) continue;
    const found = skuCountsFromText(regionText, platformHint);
    if (found[0]) regions.push({ sku: found[0].sku, quantity: 1 });
  }

  const sellerSkus = regions.filter((row) => !isMarketplaceId(row.sku));
  if (sellerSkus.length) return sellerSkus;
  if (regions.length) return regions;
  return skuCountsFromText(fullText, platformHint);
}

export function aggregateSkuCounts(rows: SkuCount[]): SkuCount[] {
  const merged = new Map<string, SkuCount>();
  for (const row of rows) {
    const sku = cleanSkuToken(row.sku);
    if (!sku || isNoiseSku(sku)) continue;
    const quantity = Number(row.quantity);
    const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const key = sku.toUpperCase();
    const existing = merged.get(key);
    if (existing) existing.quantity += qty;
    else merged.set(key, { sku, quantity: qty });
  }
  return [...merged.values()].sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: "base" }));
}

export async function extractSkuCountsFromPdf(
  file: File,
  options: {
    platformHint?: string;
    onProgress?: (progress: { file?: string; page?: number; total?: number; percent?: number }) => void;
  } = {},
): Promise<SkuCount[]> {
  const { platformHint = "auto", onProgress } = options;
  initPdfJsWorker();
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const collected: SkuCount[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const normal = textItemsFromContent(textContent, viewport.height, false);
    const flipped = textItemsFromContent(textContent, viewport.height, true);
    const normalFound = skuCountsFromItems(normal, viewport.width, viewport.height, platformHint);
    const flippedFound = skuCountsFromItems(flipped, viewport.width, viewport.height, platformHint);
    collected.push(...(normalFound.length >= flippedFound.length ? normalFound : flippedFound));
    onProgress?.({
      file: file.name,
      page: pageIndex,
      total: pdf.numPages,
      percent: Math.round((pageIndex / pdf.numPages) * 100),
    });
  }

  await pdf.destroy();
  return collected;
}
