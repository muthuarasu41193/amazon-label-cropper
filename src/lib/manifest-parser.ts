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

  const hsnQtyPrice = text.match(/\b\d{4,8}\b\s+(\d{1,4})\s+(?:Rs\.?)?\s*[\d,]/);
  if (hsnQtyPrice && Number(hsnQtyPrice[1]) > 0 && Number(hsnQtyPrice[1]) < 500) {
    return hsnQtyPrice[1];
  }

  return "";
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
  /^(order|id|sku|seller|qty|cod|pin|awb|gstin|hsn|india|amazon|meesho|flipkart|ekart|paid|prepaid|invoice|date|type)$/i;

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
  if (/^(qty|quantity|hsn|gstin)$/i.test(sku)) return true;
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

function amazonSkus(text: string) {
  const found: string[] = [];
  const asinParen = [...text.matchAll(/B0[A-Z0-9]{8}\s*\(\s*([^)]{2,48}?)\s*\)/gi)];
  for (const match of asinParen) found.push(match[1]);

  const labeled = [
    /(?:seller\s*sku|sku)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9 +_\-./]{2,48})/gi,
    /\bfnsku\s*[:.\-]?\s*(X00[A-Z0-9]{7,10})/gi,
  ];
  for (const pattern of labeled) {
    for (const match of text.matchAll(pattern)) found.push(match[1]);
  }
  return uniqueSkus(found);
}

function meeshoSkus(text: string) {
  const found: string[] = [];
  const labeled = [
    /(?:sku\s*id|supplier\s*sku|product\s*sku|sku)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9 +_\-./]{2,48})/gi,
    /(?:product\s*id|catalog\s*id)\s*[:.\-]?\s*(\d{6,14})/gi,
  ];
  for (const pattern of labeled) {
    for (const match of text.matchAll(pattern)) found.push(match[1]);
  }
  return uniqueSkus(found);
}

function flipkartSkus(text: string) {
  const found: string[] = [];
  const labeled = [
    /(?:seller\s*sku|sku\s*id|sku)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9 +_\-./]{2,48})/gi,
    /\bfsn\s*[:.\-]?\s*([A-Z0-9]{10,16})/gi,
    /\blisting\s*id\s*[:.\-]?\s*([A-Z0-9]{8,20})/gi,
  ];
  for (const pattern of labeled) {
    for (const match of text.matchAll(pattern)) found.push(match[1]);
  }
  const fsn = text.match(/\b([A-Z]{4}[A-Z0-9]{12})\b/);
  if (fsn) found.push(fsn[1]);
  return uniqueSkus(found);
}

function genericSkus(text: string) {
  const found: string[] = [];
  for (const match of text.matchAll(/(?:seller\s*sku|sku\s*id|sku)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9 +_\-./]{2,48})/gi)) {
    found.push(match[1]);
  }
  for (const match of text.matchAll(/\b([A-Z]{2,}[A-Z0-9]*[-_][A-Z0-9][-_A-Z0-9]{1,32})\b/gi)) {
    found.push(match[1]);
  }
  return uniqueSkus(found);
}

/**
 * Pull seller SKU / product IDs from OCR or PDF text for Amazon, Meesho, and Flipkart labels.
 * @returns {{ platform: string, sku: string, skus: string[], asin: string, fsn: string, fnsku: string, productId: string }}
 */
export function extractSkuDetails(text: string, platformHint = "auto"): SkuDetails {
  const blob = String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\b5KU\b/gi, "SKU")
    .replace(/\b5eller\b/gi, "Seller");
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

  if (!skus.length) skus = genericSkus(blob);

  const sku = skus.find((value) => !/^B0[A-Z0-9]{8}$/i.test(value) && !/^X00/i.test(value) && value !== fsn) || skus[0] || "";

  return {
    platform: platform === "unknown" ? "" : platform,
    sku,
    skus: uniqueSkus([sku, ...skus, asin, fnsku, fsn, productId].filter(Boolean)),
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
