import { getPlatform } from "./platforms.js";
import { createCroppedPdf, initPdfJsWorker } from "./crop-engine.js";

initPdfJsWorker();

const params = new URLSearchParams(window.location.search);
const platformId = params.get("p") || "amazon";
const platform = getPlatform(platformId);

document.documentElement.style.setProperty("--brand", platform.accent);
document.documentElement.style.setProperty("--brand-rgb", platform.accentRgb);
document.documentElement.dataset.platform = platform.id;

const els = {
  platformName: document.getElementById("platformName"),
  platformTagline: document.getElementById("platformTagline"),
  platformIcon: document.getElementById("platformIcon"),
  layoutNote: document.getElementById("layoutNote"),
  dropCopy: document.getElementById("dropCopy"),
  fileInput: document.getElementById("pdfFile"),
  dropZone: document.querySelector(".drop-zone"),
  fileName: document.getElementById("fileName"),
  cropButton: document.getElementById("cropButton"),
  downloadButton: document.getElementById("downloadButton"),
  pdfPreview: document.getElementById("pdfPreview"),
  emptyPreview: document.getElementById("emptyPreview"),
  statusText: document.getElementById("statusText"),
  detailText: document.getElementById("detailText"),
  progressBar: document.getElementById("progressBar"),
  progressWrap: document.getElementById("progressWrap"),
  cropPreset: document.getElementById("cropPreset"),
  pageSizeSelect: document.getElementById("pageSize"),
  fitModeSelect: document.getElementById("fitMode"),
  leftPercent: document.getElementById("leftPercent"),
  marginPercent: document.getElementById("marginPercent"),
  leftPercentValue: document.getElementById("leftPercentValue"),
  marginPercentValue: document.getElementById("marginPercentValue"),
  skipBlank: document.getElementById("skipBlank"),
  includeInvoiceText: document.getElementById("includeInvoiceText"),
  smartScan: document.getElementById("smartScan"),
  manualControls: document.getElementById("manualControls"),
};

els.platformName.textContent = `${platform.name} Label Cropper`;
els.platformTagline.textContent = platform.tagline;
els.platformIcon.textContent = platform.icon;
els.layoutNote.textContent = platform.layoutNote;
els.dropCopy.textContent = platform.uploadHint;
document.title = `${platform.name} Label Cropper · LabelForge`;

const d = platform.defaults;
els.cropPreset.value = d.cropPreset;
els.leftPercent.value = String(d.leftPercent);
els.marginPercent.value = String(d.marginPercent);
els.includeInvoiceText.checked = d.includeInvoiceText;
els.skipBlank.checked = d.skipBlank;
els.smartScan.checked = d.smartScan ?? true;

let selectedFile = null;
let previewUrl = null;
let croppedBlob = null;
let downloadName = `${platform.id}-labels.pdf`;

function setStatus(title, detail, isError = false) {
  els.statusText.textContent = title;
  els.detailText.textContent = detail;
  els.statusText.classList.toggle("is-error", isError);
}

function setProgress(percent, visible = true) {
  els.progressWrap.classList.toggle("is-active", visible && percent < 100);
  els.progressBar.style.width = `${percent}%`;
}

function updateManualControlsVisibility() {
  const manual = !els.smartScan.checked;
  els.manualControls.classList.toggle("is-collapsed", !manual);
  els.cropPreset.disabled = !manual;
  els.leftPercent.disabled = !manual;
  els.marginPercent.disabled = !manual;
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
  els.pdfPreview.removeAttribute("src");
  els.emptyPreview.parentElement.classList.remove("has-preview");
  els.downloadButton.disabled = true;
  setProgress(0, false);
}

function updateRangeLabels() {
  els.leftPercentValue.textContent = `${Number(els.leftPercent.value).toFixed(1).replace(".0", "")}%`;
  els.marginPercentValue.textContent = `${Number(els.marginPercent.value).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function readSettings() {
  return {
    cropPreset: els.cropPreset.value,
    leftPercent: Number(els.leftPercent.value),
    marginPercent: Number(els.marginPercent.value),
    pageSize: els.pageSizeSelect.value,
    fitMode: els.fitModeSelect.value,
    skipBlank: els.skipBlank.checked,
    includeInvoiceText: els.includeInvoiceText.checked,
    smartScan: els.smartScan.checked,
  };
}

function selectFile(file) {
  selectedFile = file || null;
  resetOutput();

  if (!selectedFile) {
    els.fileName.textContent = "No file selected";
    els.cropButton.disabled = true;
    setStatus("Waiting for a PDF.", platform.uploadHint);
    return;
  }

  if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
    selectedFile = null;
    els.fileName.textContent = "No file selected";
    els.cropButton.disabled = true;
    setStatus("Please choose a PDF", "Only PDF files can be cropped.", true);
    return;
  }

  els.fileName.textContent = selectedFile.name;
  els.cropButton.disabled = false;
  setStatus("PDF selected", selectedFile.name);
}

async function cropSelectedPdf() {
  if (!selectedFile) return;

  els.cropButton.disabled = true;
  els.downloadButton.disabled = true;
  els.cropButton.classList.add("is-loading");
  setProgress(2, true);
  setStatus("Scanning for labels…", "Analyzing each page for shipping label regions.");

  try {
    const { outputBytes, pageCount, labelsAdded, skippedBlank } = await createCroppedPdf(
      selectedFile,
      readSettings(),
      (progress) => {
        setProgress(progress.percent, true);
        if (progress.phase === "scanning") {
          setStatus(
            "Scanning for labels…",
            progress.page ? `Page ${progress.page} of ${progress.total}` : "Detecting label regions on each page.",
          );
        } else if (progress.phase === "cropping") {
          setStatus(
            "Cropping labels…",
            progress.page ? `Processing page ${progress.page} of ${progress.total}` : "Building output PDF.",
          );
        }
      },
    );

    croppedBlob = new Blob([outputBytes], { type: "application/pdf" });
    revokePreview();
    previewUrl = URL.createObjectURL(croppedBlob);
    els.pdfPreview.src = previewUrl;
    els.emptyPreview.parentElement.classList.add("has-preview");
    downloadName = selectedFile.name.replace(/\.pdf$/i, "") + `-${platform.id}-labels.pdf`;
    els.downloadButton.disabled = false;

    const skipNote = skippedBlank > 0 ? ` (${skippedBlank} empty regions skipped)` : "";
    setStatus("Cropped PDF ready", `${labelsAdded} label${labelsAdded === 1 ? "" : "s"} from ${pageCount} source page${pageCount === 1 ? "" : "s"}${skipNote}.`);
    setProgress(100, false);
  } catch (error) {
    resetOutput();
    setStatus("Could not crop this PDF", error.message || "Check the file and settings, then try again.", true);
  } finally {
    els.cropButton.disabled = !selectedFile;
    els.cropButton.classList.remove("is-loading");
  }
}

els.fileInput.addEventListener("change", () => selectFile(els.fileInput.files?.[0]));

["dragenter", "dragover"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("is-dragging");
  });
});

els.dropZone.addEventListener("drop", (event) => {
  selectFile(event.dataTransfer.files?.[0]);
});

[els.leftPercent, els.marginPercent].forEach((input) => {
  input.addEventListener("input", updateRangeLabels);
});

els.smartScan.addEventListener("change", () => {
  updateManualControlsVisibility();
  if (selectedFile) {
    resetOutput();
    setStatus("Settings changed", "Crop again to generate an updated PDF.");
  }
});

[
  els.cropPreset,
  els.pageSizeSelect,
  els.fitModeSelect,
  els.leftPercent,
  els.marginPercent,
  els.skipBlank,
  els.includeInvoiceText,
  els.smartScan,
].forEach((control) => {
  control.addEventListener("change", () => {
    if (selectedFile) {
      resetOutput();
      setStatus("Settings changed", "Crop again to generate an updated PDF.");
    }
  });
});

els.cropButton.addEventListener("click", cropSelectedPdf);
els.downloadButton.addEventListener("click", () => {
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
updateManualControlsVisibility();
setStatus("Waiting for a PDF.", platform.uploadHint);
