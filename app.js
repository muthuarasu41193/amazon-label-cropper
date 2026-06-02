const { PDFDocument, rgb } = PDFLib;

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
const sectionStartPercent = document.getElementById("sectionStartPercent");
const sectionHeightPercent = document.getElementById("sectionHeightPercent");
const sectionStartValue = document.getElementById("sectionStartValue");
const sectionHeightValue = document.getElementById("sectionHeightValue");

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
  sectionStartValue.textContent = `${sectionStartPercent.value}%`;
  sectionHeightValue.textContent = `${sectionHeightPercent.value}%`;
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

function productRowBand(invoiceBox) {
  const height = invoiceBox.top - invoiceBox.bottom;
  const start = Number(sectionStartPercent.value) / 100;
  const sectionHeight = Number(sectionHeightPercent.value) / 100;
  const bottom = invoiceBox.bottom + height * start;
  const top = Math.min(invoiceBox.top, bottom + height * sectionHeight);

  return { bottom, top };
}

function productDetailBoxes(invoiceBox) {
  const width = invoiceBox.right - invoiceBox.left;
  const band = productRowBand(invoiceBox);

  return {
    description: {
      left: invoiceBox.left + width * 0.05,
      right: invoiceBox.left + width * 0.59,
      bottom: band.bottom,
      top: band.top,
    },
    quantity: {
      left: invoiceBox.left + width * 0.66,
      right: invoiceBox.left + width * 0.72,
      bottom: band.bottom,
      top: band.top,
    },
  };
}

async function drawInvoiceSection(outputPdf, sourcePage, invoiceBox, targetPage, target, areaHeight) {
  if (!includeInvoiceText.checked || areaHeight <= 0) return;

  const boxes = productDetailBoxes(invoiceBox);
  const description = await outputPdf.embedPage(sourcePage, boxes.description);
  const quantity = await outputPdf.embedPage(sourcePage, boxes.quantity);
  const padding = 5;
  const gap = 5;
  const qtyWidth = 34;
  const descWidth = target.width - padding * 2 - gap - qtyWidth;
  const availableHeight = areaHeight - padding * 2;
  const descScale = Math.min(descWidth / description.width, availableHeight / description.height);
  const qtyScale = Math.min(qtyWidth / quantity.width, availableHeight / quantity.height);
  const descDrawWidth = description.width * descScale;
  const descDrawHeight = description.height * descScale;
  const qtyDrawWidth = quantity.width * qtyScale;
  const qtyDrawHeight = quantity.height * qtyScale;

  targetPage.drawPage(description, {
    x: padding,
    y: padding + (availableHeight - descDrawHeight) / 2,
    width: descDrawWidth,
    height: descDrawHeight,
  });
  targetPage.drawPage(quantity, {
    x: target.width - padding - qtyDrawWidth,
    y: padding + (availableHeight - qtyDrawHeight) / 2,
    width: qtyDrawWidth,
    height: qtyDrawHeight,
  });
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
  const sourcePages = sourcePdf.getPages();
  const allPairs = sourcePages.map((page) => pairedBoxesForPage(page));
  let labelsAdded = 0;

  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const pairs = allPairs[pageIndex];

    for (const pair of pairs) {
      if (await looksBlank(sourcePdf, pageIndex, pair.labelBox)) continue;

      const label = await outputPdf.embedPage(sourcePages[pageIndex], pair.labelBox);
      const target = getOutputSize(label.width, label.height);
      const page = outputPdf.addPage([target.width, target.height]);
      const infoAreaHeight = includeInvoiceText.checked && pageSizeSelect.value !== "source" ? Math.min(96, target.height * 0.24) : 0;
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

      await drawInvoiceSection(outputPdf, sourcePages[pageIndex], pair.invoiceBox, page, target, infoAreaHeight);

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

[leftPercent, marginPercent, sectionStartPercent, sectionHeightPercent].forEach((input) => {
  input.addEventListener("input", updateRangeLabels);
});

[cropPreset, pageSizeSelect, fitModeSelect, leftPercent, marginPercent, sectionStartPercent, sectionHeightPercent, skipBlank, includeInvoiceText].forEach((control) => {
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
