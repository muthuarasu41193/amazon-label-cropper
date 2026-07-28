import { scanPageForLabels, regionHasContent } from "./label-scanner.js?v=2.3.0";
import {
  parseInvoiceDetails,
  isInvoiceDetected,
  infoAreaHeightForDetails,
} from "./invoice-parser.js?v=2.3.0";

const { PDFDocument, StandardFonts, rgb } = PDFLib;

const PAGE_SIZES = {
  "4x6": { width: 288, height: 432 },
  a6: { width: 298, height: 420 },
};

function getOutputSize(cropWidth, cropHeight, pageSize) {
  if (pageSize === "source") {
    return { width: cropWidth, height: cropHeight };
  }
  return PAGE_SIZES[pageSize];
}

export function pairedBoxesForPage(page, settings) {
  const { width, height } = page.getSize();
  const leftWidth = width * (Number(settings.leftPercent) / 100);
  const rightStart = width - leftWidth;
  const margin = Math.min(width, height) * (Number(settings.marginPercent) / 100);
  const boxWidth = Math.max(1, leftWidth - margin * 2);
  const boxHeight = Math.max(1, height / 2 - margin * 2);
  const preset = settings.cropPreset;

  if (preset === "right-half") {
    return [
      {
        labelBox: {
          left: rightStart + margin,
          bottom: height / 2 + margin,
          right: width - margin,
          top: height - margin,
        },
        invoiceBox: {
          left: margin,
          bottom: height / 2 + margin,
          right: leftWidth - margin,
          top: height - margin,
        },
      },
      {
        labelBox: {
          left: rightStart + margin,
          bottom: margin,
          right: width - margin,
          top: height / 2 - margin,
        },
        invoiceBox: {
          left: margin,
          bottom: margin,
          right: leftWidth - margin,
          top: height / 2 - margin,
        },
      },
    ];
  }

  if (preset === "top-half") {
    return [
      {
        labelBox: {
          left: margin,
          bottom: height / 2 + margin,
          right: leftWidth - margin,
          top: height - margin,
        },
        invoiceBox: {
          left: leftWidth + margin,
          bottom: height / 2 + margin,
          right: width - margin,
          top: height - margin,
        },
      },
      {
        labelBox: {
          left: leftWidth + margin,
          bottom: height / 2 + margin,
          right: width - margin,
          top: height - margin,
        },
        invoiceBox: {
          left: margin,
          bottom: height / 2 + margin,
          right: leftWidth - margin,
          top: height - margin,
        },
      },
    ];
  }

  if (preset === "bottom-half") {
    return [
      {
        labelBox: {
          left: margin,
          bottom: margin,
          right: leftWidth - margin,
          top: height / 2 - margin,
        },
        invoiceBox: {
          left: leftWidth + margin,
          bottom: margin,
          right: width - margin,
          top: height / 2 - margin,
        },
      },
      {
        labelBox: {
          left: leftWidth + margin,
          bottom: margin,
          right: width - margin,
          top: height / 2 - margin,
        },
        invoiceBox: {
          left: margin,
          bottom: margin,
          right: leftWidth - margin,
          top: height / 2 - margin,
        },
      },
    ];
  }

  return [
    {
      labelBox: {
        left: margin,
        bottom: height / 2 + margin,
        right: margin + boxWidth,
        top: height - margin,
      },
      invoiceBox: {
        left: rightStart + margin,
        bottom: height / 2 + margin,
        right: width - margin,
        top: height - margin,
      },
    },
    {
      labelBox: {
        left: margin,
        bottom: margin,
        right: margin + boxWidth,
        top: height / 2 - margin,
      },
      invoiceBox: {
        left: rightStart + margin,
        bottom: margin,
        right: width - margin,
        top: height / 2 - margin,
      },
    },
  ];
}

function makePdfTextSafe(text) {
  return text
    .replace(/₹/g, "Rs.")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text, font, size, maxWidth) {
  const words = makePdfTextSafe(text).split(/\s+/).filter(Boolean);
  const lines = [];
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

function drawProductDetails(page, details, font, boldFont, target, areaHeight) {
  if (!isInvoiceDetected(details) || areaHeight <= 0) return;

  const items = details.lineItems?.length
    ? details.lineItems
    : [{ sku: "", description: details.productName || "", quantity: details.quantity || "" }];

  const padding = 8;
  const labelSize = 7.5;
  const bodySize = 6.8;
  const maxWidth = target.width - padding * 2;
  let y = areaHeight - padding;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (y < 14) break;

    const heading = items.length > 1 ? `Item ${i + 1}` : "Product";
    page.drawText(heading, { x: padding, y: y - labelSize, size: labelSize, font: boldFont, color: rgb(0, 0, 0) });
    y -= labelSize + 2;

    if (item.sku) {
      page.drawText(`SKU - ${makePdfTextSafe(item.sku)}`, {
        x: padding,
        y: y - bodySize,
        size: bodySize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= bodySize + 1;
    }

    const descLines = wrapText(item.description || "Not detected", font, bodySize, maxWidth).slice(0, 3);
    for (const line of descLines) {
      if (y < 12) break;
      page.drawText(line, { x: padding, y: y - bodySize, size: bodySize, font, color: rgb(0, 0, 0) });
      y -= bodySize + 1;
    }

    if (y >= 10) {
      page.drawText(`Qty - ${makePdfTextSafe(item.quantity || "?")}`, {
        x: padding,
        y: y - labelSize,
        size: labelSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      y -= labelSize + 5;
    }
  }

  if (items.length > 1 && y >= 10 && details.totalQuantity) {
    page.drawText(`Total Qty - ${details.totalQuantity}`, {
      x: padding,
      y: y - labelSize,
      size: labelSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
  }
}

async function resolvePagePairs(sourcePages, settings, pdfJsDoc, onProgress) {
  const allPairs = [];

  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const page = sourcePages[pageIndex];
    const { width, height } = page.getSize();

    onProgress?.({
      phase: "scanning",
      page: pageIndex + 1,
      total: sourcePages.length,
      percent: Math.round(((pageIndex + 0.5) / sourcePages.length) * 60),
    });

    if (settings.smartScan && pdfJsDoc) {
      const pdfPage = await pdfJsDoc.getPage(pageIndex + 1);
      const textContent = await pdfPage.getTextContent();
      const detected = await scanPageForLabels(pdfPage, width, height, textContent, settings);

      if (detected.length > 0) {
        allPairs.push(detected);
        continue;
      }
    }

    allPairs.push(pairedBoxesForPage(page, settings));
  }

  return allPairs;
}

async function isLabelBlank(sourcePdf, pdfJsDoc, pageIndex, box, settings, pageWidth, pageHeight) {
  if (!settings.skipBlank) return false;

  if (pdfJsDoc && settings.smartScan) {
    const pdfPage = await pdfJsDoc.getPage(pageIndex + 1);
    const hasContent = await regionHasContent(pdfPage, box, pageWidth, pageHeight);
    return !hasContent;
  }

  const probePdf = await PDFDocument.create();
  const embedded = await probePdf.embedPage(sourcePdf.getPages()[pageIndex], box);
  const page = probePdf.addPage([embedded.width, embedded.height]);
  page.drawPage(embedded, { x: 0, y: 0 });
  const bytes = await probePdf.save({ useObjectStreams: false });

  return bytes.length < 1200;
}

/**
 * @param {File} file
 * @param {{ cropPreset: string, leftPercent: number, marginPercent: number, pageSize: string, fitMode: string, skipBlank: boolean, includeInvoiceText: boolean, smartScan: boolean }} settings
 * @param {(progress: { phase: string, percent: number, page?: number, total?: number }) => void} [onProgress]
 */
export async function createCroppedPdf(file, settings, onProgress) {
  const bytes = await file.arrayBuffer();
  onProgress?.({ phase: "loading", percent: 5 });

  const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const outputPdf = await PDFDocument.create();
  const textFont = await outputPdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await outputPdf.embedFont(StandardFonts.HelveticaBold);
  const sourcePages = sourcePdf.getPages();

  let pdfJsDoc = null;
  if (settings.smartScan || settings.includeInvoiceText) {
    if (!window.pdfjsLib) throw new Error("PDF reader did not load. Refresh and try again.");
    pdfJsDoc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  }

  onProgress?.({ phase: "scanning", percent: 10 });
  const allPairs = await resolvePagePairs(sourcePages, settings, pdfJsDoc, onProgress);

  onProgress?.({ phase: "cropping", percent: 65 });
  let labelsAdded = 0;
  let skippedBlank = 0;

  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const page = sourcePages[pageIndex];
    const { width, height } = page.getSize();
    const pairs = allPairs[pageIndex];

    let textContent = null;
    if (settings.includeInvoiceText && pdfJsDoc) {
      const pdfPage = await pdfJsDoc.getPage(pageIndex + 1);
      textContent = await pdfPage.getTextContent();
    }

    for (const pair of pairs) {
      const details =
        settings.includeInvoiceText && textContent
          ? parseInvoiceDetails(textContent, pair.invoiceBox, height)
          : null;

      if (await isLabelBlank(sourcePdf, pdfJsDoc, pageIndex, pair.labelBox, settings, width, height)) {
        skippedBlank += 1;
        continue;
      }

      const label = await outputPdf.embedPage(sourcePages[pageIndex], pair.labelBox);
      const target = getOutputSize(label.width, label.height, settings.pageSize);
      const page = outputPdf.addPage([target.width, target.height]);
      const infoAreaHeight = infoAreaHeightForDetails(
        target.height,
        details,
        settings.includeInvoiceText && settings.pageSize !== "source",
      );
      const labelAreaHeight = target.height - infoAreaHeight;

      page.drawRectangle({
        x: 0,
        y: 0,
        width: target.width,
        height: target.height,
        color: rgb(1, 1, 1),
      });

      const scale =
        settings.fitMode === "cover"
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

  if (pdfJsDoc) await pdfJsDoc.destroy();

  if (!labelsAdded) {
    const hints = [];
    if (settings.skipBlank) hints.push("turn off blank-label skipping");
    if (settings.smartScan) hints.push("try manual layout mode");
    hints.push("reduce margin trim");
    throw new Error(`No labels were detected. Try ${hints.join(", ")}.`);
  }

  onProgress?.({ phase: "done", percent: 100 });
  const outputBytes = await outputPdf.save();
  return { outputBytes, pageCount: sourcePages.length, labelsAdded, skippedBlank };
}

export function initPdfJsWorker() {
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
}
