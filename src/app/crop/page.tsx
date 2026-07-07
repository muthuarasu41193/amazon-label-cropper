"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { createCroppedPdf, initPdfJsWorker, type CropSettings } from "@/lib/crop-engine";
import { getPlatform } from "@/lib/platforms";

export default function CropPage() {
  const platform = getPlatform("amazon");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState({ title: "Waiting for a PDF.", detail: platform.uploadHint, error: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadName, setDownloadName] = useState("labels.pdf");

  const [settings, setSettings] = useState<CropSettings>({
    cropPreset: platform.defaults.cropPreset,
    leftPercent: platform.defaults.leftPercent,
    marginPercent: platform.defaults.marginPercent,
    pageSize: "4x6",
    fitMode: "contain",
    skipBlank: platform.defaults.skipBlank,
    includeInvoiceText: platform.defaults.includeInvoiceText,
  });

  useEffect(() => {
    initPdfJsWorker();
  }, []);

  useEffect(() => {
    const pendingUrl = sessionStorage.getItem("pendingPdf");
    const pendingName = sessionStorage.getItem("pendingPdfName");
    if (!pendingUrl) return;

    fetch(pendingUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], pendingName || "upload.pdf", { type: "application/pdf" });
        setSelectedFile(file);
        setStatus({ title: "PDF selected", detail: file.name, error: false });
        sessionStorage.removeItem("pendingPdf");
        sessionStorage.removeItem("pendingPdfName");
        URL.revokeObjectURL(pendingUrl);
      })
      .catch(() => {
        sessionStorage.removeItem("pendingPdf");
        sessionStorage.removeItem("pendingPdfName");
      });
  }, []);

  const resetOutput = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCroppedBlob(null);
  }, [previewUrl]);

  const selectFile = useCallback(
    (file: File | undefined) => {
      resetOutput();
      if (!file) {
        setSelectedFile(null);
        setStatus({ title: "Waiting for a PDF.", detail: platform.uploadHint, error: false });
        return;
      }
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setStatus({ title: "Please choose a PDF", detail: "Only PDF files can be cropped.", error: true });
        return;
      }
      setSelectedFile(file);
      setStatus({ title: "PDF selected", detail: file.name, error: false });
    },
    [platform.uploadHint, resetOutput],
  );

  const cropPdf = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    resetOutput();
    setStatus({ title: "Cropping labels...", detail: "Processing entirely in your browser.", error: false });

    try {
      const { outputBytes, pageCount, labelsAdded } = await createCroppedPdf(selectedFile, settings);
      const blob = new Blob([outputBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setCroppedBlob(blob);
      setPreviewUrl(url);
      setDownloadName(selectedFile.name.replace(/\.pdf$/i, "") + "-labels.pdf");
      setStatus({
        title: "Cropped PDF ready",
        detail: `${labelsAdded} labels from ${pageCount} source pages.`,
        error: false,
      });
    } catch (err) {
      setStatus({
        title: "Could not crop this PDF",
        detail: err instanceof Error ? err.message : "Check the file and settings, then try again.",
        error: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPdf = () => {
    if (!croppedBlob) return;
    const url = URL.createObjectURL(croppedBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-sm font-semibold text-text">Label Cropper</span>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!croppedBlob}
            className="inline-flex items-center gap-2 rounded-[12px] bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <label
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                selectFile(e.dataTransfer.files?.[0]);
              }}
              className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed px-6 py-10 transition-all ${
                isDragging ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => selectFile(e.target.files?.[0])}
              />
              <Upload className="mb-3 h-8 w-8 text-primary" />
              <p className="font-medium text-text">Drop shipping PDF here</p>
              <p className="mt-1 text-sm text-muted">{selectedFile?.name ?? "No file selected"}</p>
            </label>

            <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <h2 className="mb-4 text-sm font-semibold text-text">Crop settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Source layout</label>
                  <select
                    value={settings.cropPreset}
                    onChange={(e) => setSettings((s) => ({ ...s, cropPreset: e.target.value }))}
                    className="w-full rounded-[12px] border border-border bg-white px-3 py-2 text-sm text-text"
                  >
                    <option value="left-half">Labels left, invoices right</option>
                    <option value="right-half">Labels right, invoices left</option>
                    <option value="top-half">Labels on top row</option>
                    <option value="bottom-half">Labels on bottom row</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Output size</label>
                  <select
                    value={settings.pageSize}
                    onChange={(e) => setSettings((s) => ({ ...s, pageSize: e.target.value }))}
                    className="w-full rounded-[12px] border border-border bg-white px-3 py-2 text-sm text-text"
                  >
                    <option value="4x6">4 × 6 in thermal label</option>
                    <option value="source">Use cropped label size</option>
                    <option value="a6">A6 page</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={settings.includeInvoiceText}
                    onChange={(e) => setSettings((s) => ({ ...s, includeInvoiceText: e.target.checked }))}
                    className="rounded border-border"
                  />
                  Add product name and quantity
                </label>
              </div>
              <button
                type="button"
                onClick={cropPdf}
                disabled={!selectedFile || isProcessing}
                className="mt-5 w-full rounded-[12px] bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {isProcessing ? "Processing…" : "Crop labels"}
              </button>
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-white shadow-[var(--shadow-soft)]">
            <div className="border-b border-border px-5 py-4">
              <p className={`text-sm font-medium ${status.error ? "text-red-600" : "text-text"}`}>{status.title}</p>
              <p className="mt-0.5 text-xs text-muted">{status.detail}</p>
            </div>
            <div className="relative min-h-[400px] bg-surface p-4">
              {previewUrl ? (
                <iframe src={previewUrl} title="Cropped PDF preview" className="h-[500px] w-full rounded-[12px] border border-border bg-white" />
              ) : (
                <div className="flex h-[400px] items-center justify-center text-sm text-muted">
                  Cropped PDF preview appears here
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
