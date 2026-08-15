import { getPlatform, MANIFEST_PLATFORMS } from "./platforms.js?v=2.6.0";
import { initPdfJsWorker } from "./crop-engine.js?v=2.6.0";
import { emptyShipment, extractShipmentsFromPdf } from "./manifest-parser.js?v=2.6.0";
import {
  createOcrWorker,
  extractSkuFromImages,
  recognizePdfPages,
  shipmentFromOcrResult,
  terminateOcrWorker,
} from "./label-ocr.js?v=2.6.0";

initPdfJsWorker();

const { PDFDocument, StandardFonts, rgb } = PDFLib;
const params = new URLSearchParams(window.location.search);
const initialPlatform = MANIFEST_PLATFORMS.includes(params.get("p")) ? params.get("p") : "amazon";
const PLATFORMS = ["amazon", "meesho", "flipkart"];
const ACCEPT = /\.(pdf|png|jpe?g)$/i;

const COLUMNS = [
  ["platform", "Platform"],
  ["awb", "AWB / Tracking"],
  ["orderId", "Order ID"],
  ["sku", "SKU"],
  ["customer", "Customer"],
  ["city", "City"],
  ["pin", "PIN"],
  ["quantity", "Qty"],
  ["payment", "Payment"],
  ["amount", "Amount"],
  ["product", "Product"],
  ["courier", "Courier"],
];

const els = {
  processButton: document.getElementById("processButton"),
  csvButton: document.getElementById("csvButton"),
  pdfButton: document.getElementById("pdfButton"),
  addRowButton: document.getElementById("addRowButton"),
  sellerName: document.getElementById("sellerName"),
  dispatchDate: document.getElementById("dispatchDate"),
  searchField: document.getElementById("searchField"),
  statusText: document.getElementById("statusText"),
  detailText: document.getElementById("detailText"),
  progressBar: document.getElementById("progressBar"),
  progressWrap: document.getElementById("progressWrap"),
  tableBody: document.getElementById("tableBody"),
  emptyTable: document.getElementById("emptyTable"),
  cropperLink: document.getElementById("cropperLink"),
  statShipments: document.getElementById("statShipments"),
  statCod: document.getElementById("statCod"),
  statPrepaid: document.getElementById("statPrepaid"),
  statAmount: document.getElementById("statAmount"),
};

/** @type {Record<string, Array<{ id: string, file: File, previewUrl: string, kind: string }>>} */
const filesByPlatform = {
  amazon: [],
  meesho: [],
  flipkart: [],
};

let shipments = [];
let ocrWorker = null;

els.dispatchDate.value = new Date().toISOString().slice(0, 10);
els.cropperLink.href = `crop.html?p=${encodeURIComponent(initialPlatform)}`;

function allFiles() {
  return PLATFORMS.flatMap((platform) => filesByPlatform[platform].map((item) => ({ ...item, platform })));
}

function setStatus(title, detail, isError = false) {
  els.statusText.textContent = title;
  els.detailText.textContent = detail || "";
  els.statusText.classList.toggle("is-error", isError);
}

function setProgress(percent, visible = true) {
  els.progressWrap.classList.toggle("is-active", visible && percent < 100);
  els.progressBar.style.width = `${percent}%`;
}

function isAcceptedFile(file) {
  const type = (file.type || "").toLowerCase();
  return (
    type === "application/pdf" ||
    type === "image/png" ||
    type === "image/jpeg" ||
    type === "image/jpg" ||
    ACCEPT.test(file.name)
  );
}

function fileKind(file) {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  return "image";
}

function fileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function revokePreview(item) {
  if (item.previewUrl && item.previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

async function pdfThumbnail(file) {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.42 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  await pdf.destroy();
  return canvas.toDataURL("image/jpeg", 0.72);
}

async function createPreview(item) {
  if (item.kind === "image") return URL.createObjectURL(item.file);
  try {
    return await pdfThumbnail(item.file);
  } catch {
    return "";
  }
}

function updateProcessButton() {
  const total = allFiles().length;
  els.processButton.disabled = total === 0;
  if (!total) {
    setStatus("Waiting for shipping labels.", "Drop PNG, JPG, or PDF files into a marketplace tray.");
  } else {
    setStatus(
      `${total} file${total === 1 ? "" : "s"} ready`,
      "Press Process Labels to read AWB, order ID, and payment details.",
    );
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function renderZone(platform) {
  const items = filesByPlatform[platform];
  const grid = document.querySelector(`[data-thumbs="${platform}"]`);
  const count = document.querySelector(`[data-count="${platform}"]`);
  const clear = document.querySelector(`[data-clear="${platform}"]`);
  const name = getPlatform(platform).name;

  count.textContent = `${items.length} file${items.length === 1 ? "" : "s"}`;
  clear.disabled = items.length === 0;
  grid.replaceChildren();

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "thumb-card";
    const safeName = escapeHtml(item.file.name);
    card.innerHTML = `
      ${item.previewUrl ? `<img src="${item.previewUrl}" alt="" />` : `<span class="thumb-fallback">PDF</span>`}
      <span class="thumb-badge">${name}</span>
      <button class="thumb-remove" type="button" data-remove="${item.id}" aria-label="Remove ${safeName}">×</button>
      <span class="thumb-name" title="${safeName}">${safeName}</span>
    `;
    grid.appendChild(card);
  }
}

function renderAllZones() {
  for (const platform of PLATFORMS) renderZone(platform);
  updateProcessButton();
}

function addFiles(platform, fileList) {
  const incoming = [...(fileList || [])].filter(isAcceptedFile);
  const skipped = [...(fileList || [])].length - incoming.length;
  const existing = new Set(filesByPlatform[platform].map((item) => fileKey(item.file)));

  for (const file of incoming) {
    const key = fileKey(file);
    if (existing.has(key)) continue;
    existing.add(key);
    const item = {
      id: crypto.randomUUID(),
      file,
      previewUrl: "",
      kind: fileKind(file),
    };
    filesByPlatform[platform].push(item);
    createPreview(item).then((url) => {
      item.previewUrl = url;
      renderZone(platform);
    });
  }

  renderAllZones();

  if (skipped > 0) {
    setStatus("Some files were skipped", "Each tray accepts PNG, JPG, and PDF only.", true);
  }
}

function removeFile(platform, id) {
  const list = filesByPlatform[platform];
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) return;
  revokePreview(list[index]);
  list.splice(index, 1);
  renderAllZones();
}

function clearPlatform(platform) {
  for (const item of filesByPlatform[platform]) revokePreview(item);
  filesByPlatform[platform] = [];
  const input = document.getElementById(`${platform}Files`);
  if (input) input.value = "";
  renderAllZones();
}

function filteredShipments() {
  const query = els.searchField.value.trim().toLowerCase();
  if (!query) return shipments.map((row, index) => ({ row, index }));
  return shipments
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => Object.values(row).join(" ").toLowerCase().includes(query));
}

function stats() {
  const cod = shipments.filter((row) => /cod/i.test(row.payment)).length;
  const prepaid = shipments.filter((row) => /pre/i.test(row.payment)).length;
  const amount = shipments.reduce((sum, row) => sum + (Number(String(row.amount).replace(/,/g, "")) || 0), 0);
  els.statShipments.textContent = String(shipments.length);
  els.statCod.textContent = String(cod);
  els.statPrepaid.textContent = String(prepaid);
  els.statAmount.textContent = amount ? amount.toLocaleString("en-IN") : "0";
}

function renderTable() {
  const rows = filteredShipments();
  els.tableBody.replaceChildren();
  els.emptyTable.hidden = shipments.length > 0;
  els.csvButton.disabled = shipments.length === 0;
  els.pdfButton.disabled = shipments.length === 0;
  stats();

  for (const { row, index } of rows) {
    const tr = document.createElement("tr");
    const num = document.createElement("td");
    num.className = "col-num";
    num.textContent = String(index + 1);
    tr.appendChild(num);

    for (const [key] of COLUMNS) {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.value = row[key] || "";
      input.setAttribute("aria-label", key);
      input.addEventListener("input", () => {
        shipments[index][key] = input.value;
        stats();
      });
      td.appendChild(input);
      tr.appendChild(td);
    }

    const action = document.createElement("td");
    action.className = "col-action";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "row-remove";
    remove.setAttribute("aria-label", "Remove row");
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      shipments.splice(index, 1);
      renderTable();
    });
    action.appendChild(remove);
    tr.appendChild(action);
    els.tableBody.appendChild(tr);
  }
}

async function getOcrWorker() {
  if (!ocrWorker) ocrWorker = await createOcrWorker();
  return ocrWorker;
}

function applyOcrSku(row, ocrResult) {
  if (!row) return null;
  if (ocrResult?.sku && !row.sku) row.sku = ocrResult.sku;
  if (ocrResult?.sku && (!row.product || row.product === row.sku)) {
    row.product = row.product || ocrResult.sku;
  }
  return row;
}

async function processFile(item, platform, onProgress) {
  if (item.kind === "pdf") {
    const rows = await extractShipmentsFromPdf(item.file, {
      platformHint: platform,
      onProgress,
    });
    if (rows.length) {
      if (rows.some((row) => !row.sku)) {
        const worker = await getOcrWorker();
        const ocr = await recognizePdfPages(item.file, { platform, worker, onProgress });
        for (const row of rows) applyOcrSku(row, ocr);
      }
      return rows.map((row) => ({ ...row, platform: row.platform || platform }));
    }

    const worker = await getOcrWorker();
    const ocr = await recognizePdfPages(item.file, { platform, worker, onProgress });
    const parsed = shipmentFromOcrResult(ocr, platform);
    return parsed ? [parsed] : [];
  }

  const worker = await getOcrWorker();
  const [ocr] = await extractSkuFromImages([item.file], {
    platform,
    worker,
    onProgress: (progress) => onProgress?.({ ...progress, percent: progress.percent, page: progress.index, total: progress.total }),
  });
  const parsed = shipmentFromOcrResult(ocr, platform);
  return parsed ? [parsed] : [];
}

async function processLabels() {
  const queue = allFiles();
  if (!queue.length) return;

  els.processButton.disabled = true;
  els.processButton.classList.add("is-loading");
  setProgress(4, true);
  setStatus("Processing labels…", "Running OCR on photos and reading PDFs for SKU, AWB, and order details.");

  try {
    const collected = [];

    for (let i = 0; i < queue.length; i += 1) {
      const item = queue[i];
      setStatus(
        "Processing labels…",
        `${getPlatform(item.platform).name} · ${item.file.name} (${i + 1} of ${queue.length})`,
      );
      const rows = await processFile(item, item.platform, (progress) => {
        const fileShare = 100 / queue.length;
        setProgress(Math.round(i * fileShare + (progress.percent / 100) * fileShare), true);
      });
      collected.push(...rows.map((row) => ({ ...row, platform: row.platform || item.platform })));
      setProgress(Math.round(((i + 1) / queue.length) * 100), true);
    }

    shipments = collected;
    renderTable();
    setProgress(100, false);

    if (!shipments.length) {
      setStatus(
        "No shipments found",
        "Check that files are Amazon, Meesho, or Flipkart labels. You can still add a blank row and type details.",
        true,
      );
      return;
    }

    setStatus(
      "Manifest ready",
      `${shipments.length} shipment${shipments.length === 1 ? "" : "s"} from ${queue.length} file${queue.length === 1 ? "" : "s"}. Edit any cell before download.`,
    );
  } catch (error) {
    setStatus("Could not process these labels", error.message || "Check the files and try again.", true);
  } finally {
    if (ocrWorker) {
      await terminateOcrWorker(ocrWorker);
      ocrWorker = null;
    }
    els.processButton.disabled = allFiles().length === 0;
    els.processButton.classList.remove("is-loading");
  }
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCsv() {
  const headers = ["#", ...COLUMNS.map(([, label]) => label)];
  const lines = [headers.map(csvEscape).join(",")];
  shipments.forEach((row, index) => {
    lines.push([index + 1, ...COLUMNS.map(([key]) => csvEscape(row[key]))].join(","));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `dispatch-manifest-${els.dispatchDate.value || "export"}.csv`);
}

function makePdfTextSafe(text) {
  return String(text || "")
    .replace(/₹/g, "Rs.")
    .replace(/[–—]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function downloadPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize = { width: 842, height: 595 };
  const margin = 28;
  const rowHeight = 18;
  const headerHeight = 86;
  const cols = [
    { key: "#", width: 28 },
    { key: "awb", width: 100 },
    { key: "orderId", width: 100 },
    { key: "sku", width: 80 },
    { key: "city", width: 78 },
    { key: "pin", width: 48 },
    { key: "quantity", width: 32 },
    { key: "payment", width: 54 },
    { key: "amount", width: 52 },
    { key: "product", width: 110 },
    { key: "courier", width: 70 },
  ];

  const seller = makePdfTextSafe(els.sellerName.value || "Seller");
  const date = els.dispatchDate.value || new Date().toISOString().slice(0, 10);
  const used = PLATFORMS.filter((platform) => filesByPlatform[platform].length).map((id) => getPlatform(id).name);
  const platformLabel = used.length ? used.join(" / ") : "Amazon / Meesho / Flipkart";

  let page = pdf.addPage([pageSize.width, pageSize.height]);
  let y = pageSize.height - margin;

  const drawHeader = (pageNumber, pageCountHint) => {
    page.drawText("Dispatch Manifest", { x: margin, y: y - 16, size: 18, font: bold, color: rgb(0.05, 0.07, 0.12) });
    page.drawText(`${seller}  ·  ${date}  ·  ${platformLabel}`, {
      x: margin,
      y: y - 34,
      size: 9,
      font,
      color: rgb(0.25, 0.3, 0.38),
    });
    page.drawText(`${shipments.length} shipment${shipments.length === 1 ? "" : "s"}  ·  Page ${pageNumber}${pageCountHint}`, {
      x: pageSize.width - margin - 180,
      y: y - 16,
      size: 9,
      font,
      color: rgb(0.25, 0.3, 0.38),
    });

    y -= headerHeight - 24;
    let x = margin;
    page.drawRectangle({
      x: margin,
      y: y - 4,
      width: pageSize.width - margin * 2,
      height: 20,
      color: rgb(0.93, 0.95, 0.98),
    });
    for (const col of cols) {
      const label = col.key === "#" ? "#" : COLUMNS.find(([key]) => key === col.key)?.[1] || col.key;
      page.drawText(makePdfTextSafe(label), { x: x + 4, y: y + 2, size: 7, font: bold, color: rgb(0.2, 0.24, 0.3) });
      x += col.width;
    }
    y -= 8;
  };

  drawHeader(1, "");

  shipments.forEach((row, index) => {
    if (y < margin + rowHeight + 24) {
      page = pdf.addPage([pageSize.width, pageSize.height]);
      y = pageSize.height - margin;
      drawHeader(pdf.getPageCount(), "");
    }

    let x = margin;
    const values = { "#": String(index + 1), ...row };
    if (index % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - 4,
        width: pageSize.width - margin * 2,
        height: rowHeight,
        color: rgb(0.97, 0.98, 0.99),
      });
    }
    for (const col of cols) {
      const raw = makePdfTextSafe(values[col.key] || "");
      let text = raw;
      while (text && font.widthOfTextAtSize(text, 7.5) > col.width - 8) {
        text = text.slice(0, -1);
      }
      if (text !== raw && text.length > 1) text = `${text.slice(0, -1)}...`;
      page.drawText(text, { x: x + 4, y, size: 7.5, font, color: rgb(0.08, 0.1, 0.14) });
      x += col.width;
    }
    y -= rowHeight;
  });

  const bytes = await pdf.save();
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), `dispatch-manifest-${date}.pdf`);
}

for (const platform of PLATFORMS) {
  const zone = document.querySelector(`.platform-zone[data-platform="${platform}"]`);
  const input = document.getElementById(`${platform}Files`);
  const dropZone = zone.querySelector(".drop-zone");

  input.addEventListener("change", () => {
    addFiles(platform, input.files);
    input.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add("is-dragging");
      dropZone.classList.add("is-dragging");
    });
  });

  zone.addEventListener("dragleave", (event) => {
    if (event.relatedTarget && zone.contains(event.relatedTarget)) return;
    zone.classList.remove("is-dragging");
    dropZone.classList.remove("is-dragging");
  });

  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("is-dragging");
    dropZone.classList.remove("is-dragging");
    addFiles(platform, event.dataTransfer.files);
  });

  zone.addEventListener("click", (event) => {
    const clear = event.target.closest("[data-clear]");
    if (clear) {
      event.preventDefault();
      clearPlatform(clear.dataset.clear);
      return;
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) {
      event.preventDefault();
      removeFile(platform, remove.dataset.remove);
    }
  });
}

els.processButton.addEventListener("click", processLabels);
els.csvButton.addEventListener("click", downloadCsv);
els.pdfButton.addEventListener("click", downloadPdf);
els.addRowButton.addEventListener("click", () => {
  shipments.push(emptyShipment());
  renderTable();
});
els.searchField.addEventListener("input", renderTable);

renderAllZones();
renderTable();
setStatus("Waiting for shipping labels.", "Drop PNG, JPG, or PDF files into a marketplace tray.");
