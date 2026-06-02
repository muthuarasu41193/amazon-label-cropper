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

function textItemsInBox(textContent, box, pageHeight, flipY) {
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

function findHeader(rows) {
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

function fixedColumnHeader(items) {
  if (!items.length) return null;

  const xs = items.map((item) => item.x);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const width = Math.max(1, right - left);

  return {
    index: -1,
    descriptionX: left + width * 0.03,
    unitX: left + width * 0.60,
    qtyX: left + width * 0.68,
  };
}

function extractQuantityFromRowText(text) {
  const normalized = text.replace(/₹/g, "Rs.").replace(/\s+/g, " ").trim();
  const priceThenQty = normalized.match(/(?:Rs\.)?\s*\d[\d,.]*\s+(\d{1,3})\s+(?:Rs\.|\d[\d,.]*)/i);
  if (priceThenQty) return priceThenQty[1];

  const qtyText = normalized.match(/\b(?:qty|quantity)\D+(\d{1,3})\b/i);
  if (qtyText) return qtyText[1];

  const smallNumbers = normalized.match(/\b\d{1,3}\b/g) || [];
  return smallNumbers.find((value) => Number(value) > 0 && Number(value) < 1000) || "";
}

function parseProductDetailsFromItems(items) {
  const rows = itemRows(items);
  const header = findHeader(rows) || fixedColumnHeader(items);
  if (!header) return null;

  const descriptionParts = [];
  let quantity = "";

  for (const row of rows.slice(Math.max(0, header.index + 1))) {
    if (/\b(total|subtotal|tax|amount in words|signature|authorized)\b/i.test(row.text)) break;
    if (/\b(order number|order date|invoice|place of supply|place of delivery)\b/i.test(row.text)) continue;

    const descriptionText = row.items
      .filter((item) => item.x >= header.descriptionX - 4 && item.x < header.unitX - 4)
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (descriptionText && !/^\d+$/.test(descriptionText)) descriptionParts.push(descriptionText);

    if (!quantity && header.qtyX !== null) {
      const qtyItem = row.items.find((item) => item.x >= header.qtyX - 18 && item.x <= header.qtyX + 45 && /^\d{1,3}$/.test(item.text.trim()));
      if (qtyItem) quantity = qtyItem.text.trim();
    }

    if (!quantity) quantity = extractQuantityFromRowText(row.text);

    if (descriptionParts.length >= 4 && quantity) break;
  }

  const productName = descriptionParts.join(" ").replace(/\s+/g, " ").trim();
  if (!productName && !quantity) return null;

  return {
    productName,
    quantity,
  };
}

function isDetected(details) {
  return Boolean(details?.productName || details?.quantity);
}

async function extractProductDetails(pdfBytes, sourcePages, allPairs) {
  if (!includeInvoiceText.checked) return [];
  if (!window.pdfjsLib) throw new Error("PDF text reader did not load. Refresh and try again.");

  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
  const pdf = await loadingTask.promise;
  const details = [];

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

function drawProductDetails(page, details, font, boldFont, target, areaHeight) {
  if (!isDetected(details) || areaHeight <= 0) return;

  const padding = 9;
  const labelSize = 8;
  const bodySize = 8.5;
  const maxWidth = target.width - padding * 2;
  let y = areaHeight - padding - labelSize;

  page.drawText("Product Name -", { x: padding, y, size: labelSize, font: boldFont, color: rgb(0, 0, 0) });
  y -= 10;

  const productLines = wrapText(details.productName || "Not detected", font, bodySize, maxWidth).slice(0, 4);
  for (const line of productLines) {
    if (y < 18) break;
    page.drawText(line, { x: padding, y, size: bodySize, font, color: rgb(0, 0, 0) });
    y -= 9.5;
  }

  if (y >= 8) {
    page.drawText(`Quantity - ${makePdfTextSafe(details.quantity || "Not detected")}`, {
      x: padding,
      y,
      size: labelSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
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
  const productDetails = await extractProductDetails(bytes, sourcePages, allPairs);
  let labelsAdded = 0;
  let detailsIndex = 0;

  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const pairs = allPairs[pageIndex];

    for (const pair of pairs) {
      const details = productDetails[detailsIndex] || null;
      detailsIndex += 1;

      if (includeInvoiceText.checked && !isDetected(details)) continue;
      if (await looksBlank(sourcePdf, pageIndex, pair.labelBox)) continue;

      const label = await outputPdf.embedPage(sourcePages[pageIndex], pair.labelBox);
      const target = getOutputSize(label.width, label.height);
      const page = outputPdf.addPage([target.width, target.height]);
      const infoAreaHeight = includeInvoiceText.checked && pageSizeSelect.value !== "source" ? Math.min(104, target.height * 0.25) : 0;
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

      drawProductDetails(page, details, textFont, boldFont, target, infoAreaHeight);

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
