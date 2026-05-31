const { PDFDocument, StandardFonts, rgb } = PDFLib;

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const fileInput = document.getElementById("pdfFile");
const dropZone = document.querySelector(".drop-zone");
const fileName = document.getElementById("fileName");
const cropButton = document.getElementById("cropButton");
const downloadButton = document.getElementById("downloadButton");
const pdfPreview = document.getElementById("pdfPreview");
const emptyPreview = document.getElementById("emptyPreview");
const statusText = document.getElementById("statusText");
const detailText = document.getElementById("detailText");
const cropPreset = document.getElementById("cropPreset");
const pageSizeSelect = document.getElementById("pageSize");
const fitModeSelect = document.getElementById("fitMode");
const leftPercent = document.getElementById("leftPercent");
const marginPercent = document.getElementById("marginPercent");
const leftPercentValue = document.getElementById("leftPercentValue");
const marginPercentValue = document.getElementById("marginPercentValue");
const skipBlank = document.getElementById("skipBlank");
const includeInvoiceText = document.getElementById("includeInvoiceText");

let selectedFile = null;
let previewUrl = null;
let croppedBlob = null;
let downloadName = "amazon-labels-cropped.pdf";

const PAGE_SIZES = {
  "4x6": { width: 288, height: 432 },
  a6: { width: 298, height: 420 },
};

function setStatus(title, detail, isError = false) {
  statusText.textContent = title;
  detailText.textContent = detail;
  statusText.style.color = isError ? "#9a3412" : "";
}

function revokePreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
}

function resetOutput() {
  revokePreview();
  croppedBlob = null;
  pdfPreview.removeAttribute("src");
  emptyPreview.parentElement.classList.remove("has-preview");
  downloadButton.disabled = true;
}

function updateRangeLabels() {
  leftPercentValue.textContent = `${Number(leftPercent.value).toFixed(1).replace(".0", "")}%`;
  marginPercentValue.textContent = `${Number(marginPercent.value).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function selectFile(file) {
  selectedFile = file || null;
  resetOutput();

  if (!selectedFile) {
    fileName.textContent = "No file selected";
    cropButton.disabled = true;
    setStatus("Waiting for a PDF.", "Upload the official Amazon 2-label-per-page file to begin.");
    return;
  }

  if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
    selectedFile = null;
    fileName.textContent = "No file selected";
    cropButton.disabled = true;
    setStatus("Please choose a PDF", "Only PDF files can be cropped.", true);
    return;
  }

  fileName.textContent = selectedFile.name;
  cropButton.disabled = false;
  setStatus("PDF selected", selectedFile.name);
}

function getOutputSize(cropWidth, cropHeight) {
  const value = pageSizeSelect.value;
  if (value === "source") {
    return { width: cropWidth, height: cropHeight };
  }
  return PAGE_SIZES[value];
}

function pairedBoxesForPage(page) {
  const { width, height } = page.getSize();
  const leftWidth = width * (Number(leftPercent.value) / 100);
  const rightStart = width - leftWidth;
  const margin = Math.min(width, height) * (Number(marginPercent.value) / 100);
  const boxWidth = Math.max(1, leftWidth - margin * 2);
  const boxHeight = Math.max(1, height / 2 - margin * 2);

  if (cropPreset.value === "right-half") {
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

  if (cropPreset.value === "top-half") {
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

  if (cropPreset.value === "bottom-half") {
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

function lineWrap(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function groupTextItemsIntoRows(items) {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 3) return b.y - a.y;
    return a.x - b.x;
  });
  const rows = [];

  for (const item of sorted) {
    const row = rows.find((entry) => Math.abs(entry.y - item.y) <= 3);
    if (row) {
      row.items.push(item);
      row.y = (row.y + item.y) / 2;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows.map((row) => {
    const rowItems = row.items.sort((a, b) => a.x - b.x);
    return {
      y: row.y,
      items: rowItems,
      text: rowItems
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    };
  }).filter((row) => row.text);
}

function cleanProductText(text) {
  return text
    .replace(/₹/g, "Rs.")
    .replace(/\b(description|product name|product|item|qty|quantity)\b/gi, " ")
    .replace(/\b(hsn|sku|asin|unit price|net amount|tax rate|tax type|igst|cgst|sgst|total amount|amount|invoice)\b.*$/i, " ")
    .replace(/^\s*(sl\.?\s*no\.?|s\.?\s*no\.?|no\.?)?\s*\d+[\).\-\s]*/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rowHasStopText(text) {
  return /\b(total|subtotal|tax amount|tax rate|authorized signatory|signature|amount in words|reverse charge)\b/i.test(text);
}

function likelyProductRow(row) {
  const text = row.text;
  if (rowHasStopText(text)) return false;
  if (/\b(order id|invoice|billing address|shipping address|sold by|ship from|pan no|gst)\b/i.test(text)) return false;
  if (!/[a-zA-Z]{3,}/.test(text)) return false;
  return true;
}

function findHeaderColumns(rows) {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const headerItems = row.items.filter((item) => /\b(description|product|item|qty|quantity)\b/i.test(item.text));
    const descriptionItem = headerItems.find((item) => /\b(description|product|item)\b/i.test(item.text));
    const quantityItem = headerItems.find((item) => /\b(qty|quantity)\b/i.test(item.text));

    if (descriptionItem || quantityItem || /\bdescription\b/i.test(row.text)) {
      return {
        index,
        descriptionX: descriptionItem?.x ?? row.items[0]?.x ?? 0,
        quantityX: quantityItem?.x ?? null,
      };
    }
  }

  return null;
}

function summarizeInvoiceItems(items) {
  const rows = groupTextItemsIntoRows(items);
  const header = findHeaderColumns(rows);
  const searchableRows = rows.slice(header ? header.index + 1 : 0);
  const quantityX = header?.quantityX;
  const productRows = [];
  let quantity = "";

  for (const row of searchableRows) {
    if (rowHasStopText(row.text)) break;
    if (!likelyProductRow(row)) continue;

    const productItems = row.items.filter((item) => {
      if (quantityX === null || quantityX === undefined) return true;
      return item.x < quantityX - 4;
    });
    const productPart = cleanProductText(productItems.map((item) => item.text).join(" "));
    if (productPart) productRows.push(productPart);

    if (!quantity && quantityX !== null && quantityX !== undefined) {
      const quantityItem = row.items.find((item) => item.x >= quantityX - 10 && item.x <= quantityX + 55 && /^\d+$/.test(item.text.trim()));
      if (quantityItem) quantity = quantityItem.text.trim();
    }

    if (!quantity) {
      const qtyMatch = row.text.match(/\b(?:qty|quantity)\D*(\d+)/i);
      if (qtyMatch) quantity = qtyMatch[1];
    }

    if (productRows.length >= 3 && quantity) break;
  }

  let product = cleanProductText(productRows.join(" "));
  if (!product) {
    const fallback = rows
      .filter(likelyProductRow)
      .map((row) => cleanProductText(row.text))
      .filter(Boolean)
      .slice(0, 2)
      .join(" ");
    product = fallback || "Not detected";
  }

  if (!quantity) {
    const qtyLine = rows.find((row) => /\b(qty|quantity)\b/i.test(row.text) && /\d+/.test(row.text));
    quantity = qtyLine?.text.match(/\b(?:qty|quantity)\D*(\d+)/i)?.[1] || "";
  }

  return `Product: ${product}${quantity ? ` | Qty: ${quantity}` : ""}`;
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

async function extractInvoiceSummaries(pdfBytes, sourcePages, allPairs) {
  if (!includeInvoiceText.checked) return [];
  if (!window.pdfjsLib) {
    throw new Error("PDF text reader did not load. Please check your internet connection and refresh.");
  }

  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
  const pdf = await loadingTask.promise;
  const summaries = [];

  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const pdfPage = await pdf.getPage(pageIndex + 1);
    const textContent = await pdfPage.getTextContent();
    const pairs = allPairs[pageIndex];

    for (const pair of pairs) {
      const items = textContent.items
        .map((item) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
        }))
        .filter((item) => {
          const box = pair.invoiceBox;
          return item.x >= box.left && item.x <= box.right && item.y >= box.bottom && item.y <= box.top;
        });

      summaries.push(summarizeInvoiceItems(items));
    }
  }

  await loadingTask.destroy();
  return summaries;
}

function drawInvoiceSummary(page, summary, font, boldFont, target, areaHeight) {
  if (!summary || areaHeight <= 0) return;

  const safeSummary = makePdfTextSafe(summary);
  const padding = 10;
  const headingSize = 8;
  const bodySize = 7.5;
  const maxChars = Math.max(28, Math.floor((target.width - padding * 2) / (bodySize * 0.48)));
  const lines = lineWrap(safeSummary, maxChars).slice(0, 6);
  let y = areaHeight - padding - headingSize;

  page.drawText("Product", {
    x: padding,
    y,
    size: headingSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= 11;
  for (const line of lines) {
    if (y < 5) break;
    page.drawText(line, {
      x: padding,
      y,
      size: bodySize,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 9;
  }
}

async function looksBlank(sourcePdf, pageIndex, box) {
  if (!skipBlank.checked) return false;

  const probePdf = await PDFDocument.create();
  const embedded = await probePdf.embedPage(sourcePdf.getPages()[pageIndex], box);
  const page = probePdf.addPage([embedded.width, embedded.height]);
  page.drawPage(embedded, { x: 0, y: 0 });
  const bytes = await probePdf.save({ useObjectStreams: false });

  // A tiny cropped object normally means Amazon left that slot blank.
  return bytes.length < 1400;
}

async function createCroppedPdf(file) {
  const bytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const outputPdf = await PDFDocument.create();
  const textFont = await outputPdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await outputPdf.embedFont(StandardFonts.HelveticaBold);
  const sourcePages = sourcePdf.getPages();
  const allPairs = sourcePages.map((page) => pairedBoxesForPage(page));
  const invoiceSummaries = await extractInvoiceSummaries(bytes, sourcePages, allPairs);
  let labelsAdded = 0;
  let summaryIndex = 0;

  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const pairs = allPairs[pageIndex];

    for (const pair of pairs) {
      const summary = invoiceSummaries[summaryIndex] || "";
      summaryIndex += 1;

      if (await looksBlank(sourcePdf, pageIndex, pair.labelBox)) continue;

      const label = await outputPdf.embedPage(sourcePages[pageIndex], pair.labelBox);
      const target = getOutputSize(label.width, label.height);
      const page = outputPdf.addPage([target.width, target.height]);
      const infoAreaHeight = includeInvoiceText.checked && pageSizeSelect.value !== "source" ? Math.min(86, target.height * 0.22) : 0;
      const labelAreaHeight = target.height - infoAreaHeight;
      page.drawRectangle({
        x: 0,
        y: 0,
        width: target.width,
        height: target.height,
        color: rgb(1, 1, 1),
      });

      const scale =
        fitModeSelect.value === "cover"
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

      drawInvoiceSummary(page, summary, textFont, boldFont, target, infoAreaHeight);

      labelsAdded += 1;
    }
  }

  if (!labelsAdded) {
    throw new Error("No labels were detected. Try turning off blank-label skipping or reducing margin trim.");
  }

  const outputBytes = await outputPdf.save();
  return { outputBytes, pageCount: sourcePages.length, labelsAdded };
}

async function cropSelectedPdf() {
  if (!selectedFile) return;

  cropButton.disabled = true;
  downloadButton.disabled = true;
  setStatus("Cropping labels...", "Processing the PDF in your browser.");

  try {
    const { outputBytes, pageCount, labelsAdded } = await createCroppedPdf(selectedFile);
    croppedBlob = new Blob([outputBytes], { type: "application/pdf" });
    revokePreview();
    previewUrl = URL.createObjectURL(croppedBlob);
    pdfPreview.src = previewUrl;
    emptyPreview.parentElement.classList.add("has-preview");
    downloadName = selectedFile.name.replace(/\.pdf$/i, "") + "-labels-only.pdf";
    downloadButton.disabled = false;
    setStatus("Cropped PDF ready", `${labelsAdded} labels created from ${pageCount} source pages.`);
  } catch (error) {
    resetOutput();
    setStatus("Could not crop this PDF", error.message || "Please check the file and try again.", true);
  } finally {
    cropButton.disabled = !selectedFile;
  }
}

fileInput.addEventListener("change", () => {
  selectFile(fileInput.files?.[0]);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});

dropZone.addEventListener("drop", (event) => {
  selectFile(event.dataTransfer.files?.[0]);
});

[leftPercent, marginPercent].forEach((input) => {
  input.addEventListener("input", updateRangeLabels);
});

[cropPreset, pageSizeSelect, fitModeSelect, leftPercent, marginPercent, skipBlank, includeInvoiceText].forEach((control) => {
  control.addEventListener("change", () => {
    if (selectedFile) {
      resetOutput();
      setStatus("Settings changed", "Crop again to generate an updated PDF.");
    }
  });
});

cropButton.addEventListener("click", cropSelectedPdf);
downloadButton.addEventListener("click", () => {
  if (!croppedBlob) return;

  const url = URL.createObjectURL(croppedBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = downloadName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
updateRangeLabels();
