/**
 * Multi-line invoice parser for marketplace tax invoices.
 * Extracts every line item with SKU, description, and exact quantity.
 */

function itemRows(items) {
  const rows = [];
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

function findHeader(rows) {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const description = row.items.find((item) => /description/i.test(item.text));
    const qty = row.items.find((item) => /^qty$/i.test(item.text) || /^quantity$/i.test(item.text));
    const unit = row.items.find((item) => /unit\s*price/i.test(item.text) || /^unit$/i.test(item.text));
    const sku = row.items.find((item) => /^sku$/i.test(item.text) || /seller\s*sku/i.test(item.text));
    const hsn = row.items.find((item) => /^hsn$/i.test(item.text) || /hsn\s*code/i.test(item.text));

    if (description && (qty || unit)) {
      return {
        index: i,
        descriptionX: description.x,
        unitX: unit?.x ?? qty?.x ?? description.x + 220,
        qtyX: qty?.x ?? null,
        skuX: sku?.x ?? null,
        hsnX: hsn?.x ?? null,
      };
    }
  }

  return null;
}

function fixedColumnHeader(items) {
  if (!items.length) return null;

  const xs = items.map((item) => item.x);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const width = Math.max(1, right - left);

  return {
    index: -1,
    descriptionX: left + width * 0.03,
    unitX: left + width * 0.55,
    qtyX: left + width * 0.48,
    skuX: null,
    hsnX: left + width * 0.42,
  };
}

function itemsInColumn(rowItems, x, tolerance = 22, maxWidth = 80) {
  if (x === null || x === undefined) return [];
  return rowItems.filter((item) => item.x >= x - tolerance && item.x <= x + maxWidth);
}

function columnText(rowItems, x, tolerance = 22, maxWidth = 80) {
  return itemsInColumn(rowItems, x, tolerance, maxWidth)
    .map((item) => item.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const SKU_PATTERNS = [
  /\bSeller\s*SKU[:\s]+([A-Z0-9][A-Z0-9\-_]{1,})\b/i,
  /\bSKU[:\s]+([A-Z0-9][A-Z0-9\-_]{1,})\b/i,
  /\bFNSKU[:\s]+([A-Z0-9]{8,})\b/i,
  /\bASIN[:\s]+(B0[A-Z0-9]{8,9})\b/i,
  /\b([A-Z0-9]{10,})\b/,
];

function cleanDescription(text) {
  return text
    .replace(/\bSeller\s*SKU[:\s]+\S+/gi, "")
    .replace(/\bSKU[:\s]+\S+/gi, "")
    .replace(/\bFNSKU[:\s]+\S+/gi, "")
    .replace(/\bASIN[:\s]+\S+/gi, "")
    .replace(/\bHSN\b.*$/i, "")
    .replace(/\bHSN\s*Code\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSkuFromText(text) {
  for (const pattern of SKU_PATTERNS.slice(0, 4)) {
    const match = text.match(pattern);
    if (match?.[1] && !/^\d{4,8}$/.test(match[1])) return match[1].trim();
  }
  return "";
}

function extractSkuFromRow(row, header) {
  const skuColumn = columnText(row.items, header.skuX);
  if (skuColumn && !/^(sku|seller)$/i.test(skuColumn)) {
    const cleaned = skuColumn.replace(/[^\w\-]/g, "").trim();
    if (cleaned.length >= 3) return cleaned;
  }

  return extractSkuFromText(row.text);
}

function isHsnOnly(text) {
  return /^\d{4,8}$/.test(text.trim()) || /^hsn\b/i.test(text.trim());
}

function extractQtyFromRow(row, header) {
  const qtyColumn = columnText(row.items, header.qtyX, 24, 60);
  if (qtyColumn) {
    const direct = qtyColumn.match(/^(\d{1,4})$/);
    if (direct) return direct[1];
  }

  const hsnColumn = columnText(row.items, header.hsnX, 18, 50);
  const qtyCandidates = row.items
    .filter((item) => {
      if (header.hsnX !== null && Math.abs(item.x - header.hsnX) < 20 && /^\d{4,8}$/.test(item.text.trim())) {
        return false;
      }
      if (header.descriptionX !== null && item.x < header.unitX - 10) return false;
      return /^\d{1,4}$/.test(item.text.trim());
    })
    .map((item) => item.text.trim());

  if (qtyCandidates.length === 1) return qtyCandidates[0];

  if (header.qtyX !== null) {
    const nearQty = row.items
      .filter((item) => item.x >= header.qtyX - 30 && item.x <= header.qtyX + 70)
      .map((item) => item.text.trim())
      .filter((text) => /^\d{1,4}$/.test(text));
    if (nearQty.length) return nearQty[0];
  }

  const hsnQtyPrice = row.text.match(/\b\d{4,8}\b\s+(\d{1,4})\s+(?:Rs\.?)?\s*[\d,]/);
  if (hsnQtyPrice) return hsnQtyPrice[1];

  const priceQty = row.text.match(/(?:Rs\.?)?\s*\d[\d,.]*\s+(\d{1,4})\s+(?:Rs\.?|\d[\d,.]*)/i);
  if (priceQty) return priceQty[1];

  return "";
}

function isInvoiceLineRow(row, header) {
  const qty = extractQtyFromRow(row, header);
  if (!qty) return false;
  const hasHsn = /\b\d{4,8}\b/.test(row.text);
  const hasPrice = /[\d,]+\.\d{2}/.test(row.text);
  return hasHsn || hasPrice;
}

function extractDescriptionFromRow(row, header) {
  const descItems = row.items.filter(
    (item) => item.x >= header.descriptionX - 6 && item.x < (header.hsnX ?? header.unitX) - 6,
  );
  const text = descItems
    .map((item) => item.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const cleaned = cleanDescription(text);
  if (!cleaned || isHsnOnly(cleaned) || /^\d+(\.\d+)?$/.test(cleaned)) return "";
  return cleaned;
}

function isFooterRow(text) {
  return /\b(total|subtotal|grand\s*total|tax\s*amount|amount\s*in\s*words|signature|authorized|round\s*off|invoice\s*value)\b/i.test(
    text,
  );
}

function isMetaRow(text) {
  return /\b(order\s*number|order\s*date|invoice\s*number|invoice\s*date|place\s*of\s*supply|place\s*of\s*delivery|bill\s*to|ship\s*to|gstin|pan)\b/i.test(
    text,
  );
}

function isContinuationRow(row, header) {
  const description = extractDescriptionFromRow(row, header);
  if (!description) return false;
  const qty = extractQtyFromRow(row, header);
  if (qty) return false;
  if (/\d+\.\d{2}/.test(row.text)) return false;
  if (/\b(total|subtotal|tax)\b/i.test(row.text)) return false;
  return true;
}

function isDataRow(row, header) {
  if (isFooterRow(row.text) || isMetaRow(row.text)) return false;

  const description = extractDescriptionFromRow(row, header);
  const qty = extractQtyFromRow(row, header);
  const sku = extractSkuFromRow(row, header);

  if (qty && (description || sku)) return true;
  if (description && /\d+\.\d{2}/.test(row.text)) return true;
  if (description && sku) return true;
  if (description && description.length > 4) return true;
  return false;
}

function finalizeLineItem(item) {
  const description = cleanDescription(item.description);
  const quantity = String(item.quantity || "").trim();
  const sku = (item.sku || "").trim();

  if (!description && !sku && !quantity) return null;
  return {
    sku,
    description,
    quantity,
  };
}

/**
 * @param {Array<{ text: string, x: number, y: number }>} items
 * @returns {{ lineItems: Array<{ sku: string, description: string, quantity: string }>, productName: string, quantity: string, totalQuantity: number } | null}
 */
export function parseInvoiceLineItems(items) {
  if (!items.length) return null;

  const rows = itemRows(items);
  const header = findHeader(rows) || fixedColumnHeader(items);
  if (!header) return null;

  const lineItems = [];
  let current = null;

  for (const row of rows.slice(Math.max(0, header.index + 1))) {
    if (isFooterRow(row.text)) break;
    if (isMetaRow(row.text)) continue;

    if (isContinuationRow(row, header)) {
      const extra = extractDescriptionFromRow(row, header);
      if (current && extra) {
        current.description = `${current.description} ${extra}`.replace(/\s+/g, " ").trim();
      }
      continue;
    }

    if (!isDataRow(row, header)) continue;

    const description = extractDescriptionFromRow(row, header);
    const quantity = extractQtyFromRow(row, header);
    const sku = extractSkuFromRow(row, header);

    if (current && !current.quantity && quantity) {
      current.quantity = quantity;
      if (sku && !current.sku) current.sku = sku;
      if (description && !current.description.includes(description)) {
        current.description = `${current.description} ${description}`.replace(/\s+/g, " ").trim();
      }
      continue;
    }

    if (current) {
      const finalized = finalizeLineItem(current);
      if (finalized) lineItems.push(finalized);
    }

    current = {
      sku,
      description,
      quantity,
    };
  }

  if (current) {
    const finalized = finalizeLineItem(current);
    if (finalized) lineItems.push(finalized);
  }

  if (!lineItems.length) return null;

  const totalQuantity = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const productName = lineItems
    .map((item) => {
      const skuPart = item.sku ? `[${item.sku}] ` : "";
      return `${skuPart}${item.description}`.trim();
    })
    .join(" | ");

  return {
    lineItems,
    productName,
    quantity: lineItems.length === 1 ? lineItems[0].quantity : String(totalQuantity),
    totalQuantity,
  };
}

export function textItemsInBox(textContent, box, pageHeight, flipY) {
  return textContent.items
    .map((item) => {
      const rawY = item.transform[5];
      return {
        text: item.str,
        x: item.transform[4],
        y: flipY ? pageHeight - rawY : rawY,
      };
    })
    .filter((item) => item.x >= box.left && item.x <= box.right && item.y >= box.bottom && item.y <= box.top);
}

export function parseInvoiceDetails(textContent, invoiceBox, pageHeight) {
  const normal = textItemsInBox(textContent, invoiceBox, pageHeight, false);
  const flipped = textItemsInBox(textContent, invoiceBox, pageHeight, true);
  return parseInvoiceLineItems(normal) || parseInvoiceLineItems(flipped) || null;
}

export function isInvoiceDetected(details) {
  return Boolean(details?.lineItems?.length || details?.productName || details?.quantity);
}

export function infoAreaHeightForDetails(targetHeight, details, enabled) {
  if (!enabled) return 0;

  const itemCount = Math.max(1, details?.lineItems?.length || 1);
  const base = 56;
  const perItem = 34;
  const computed = base + itemCount * perItem;
  return Math.min(computed, targetHeight * 0.48);
}
