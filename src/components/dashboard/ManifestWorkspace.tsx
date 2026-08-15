"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import { MobileMenuButton, Sidebar } from "@/components/dashboard/Sidebar";
import { ToolHeaderTabs } from "@/components/dashboard/ToolNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { initPdfJsWorker } from "@/lib/crop-engine";
import {
  createOcrWorker,
  extractSkuCountsFromPdfSmart,
  extractSkuFromImages,
  skuCountsFromOcrResult,
  terminateOcrWorker,
} from "@/lib/label-ocr";
import {
  aggregateSkuCounts,
  emptySkuCount,
  type SkuCount,
} from "@/lib/manifest-parser";
import { getPlatform } from "@/lib/platforms";
import { useDragState } from "@/lib/useDragOver";

type PlatformId = "amazon" | "meesho" | "flipkart";
type UploadItem = { id: string; file: File; previewUrl: string; kind: "pdf" | "image" };

const ZONES: { id: PlatformId; name: string; hint: string }[] = [
  { id: "amazon", name: "Amazon Labels", hint: "PNG, JPG, or PDF" },
  { id: "meesho", name: "Meesho Labels", hint: "PNG, JPG, or PDF" },
  { id: "flipkart", name: "Flipkart Labels", hint: "PNG, JPG, or PDF" },
];

const ACCEPT = /\.(pdf|png|jpe?g)$/i;

function isAccepted(file: File) {
  const type = (file.type || "").toLowerCase();
  return (
    type === "application/pdf" ||
    type === "image/png" ||
    type === "image/jpeg" ||
    type === "image/jpg" ||
    ACCEPT.test(file.name)
  );
}

function fileKind(file: File): "pdf" | "image" {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

async function pdfThumbnail(file: File) {
  initPdfJsWorker();
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.4 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  await page.render({ canvasContext: ctx, viewport }).promise;
  await pdf.destroy();
  return canvas.toDataURL("image/jpeg", 0.72);
}

function PlatformZone({
  zone,
  items,
  onAdd,
  onClear,
  onRemove,
}: {
  zone: (typeof ZONES)[number];
  items: UploadItem[];
  onAdd: (files: FileList | File[]) => void;
  onClear: () => void;
  onRemove: (id: string) => void;
}) {
  const platform = getPlatform(zone.id);
  const { isDragging, onDragEnter, onDragLeave, onDragOver, resetDrag } = useDragState();

  return (
    <section className="panel-card p-4">
      <div className="mb-3 flex items-start gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-xs font-bold"
          style={{ backgroundColor: `${platform.accent}22`, color: platform.accent }}
        >
          {platform.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-text">{zone.name}</h2>
          <p className="text-[11px] text-muted">{zone.hint} · multiple files</p>
        </div>
        <Button variant="ghost" size="sm" disabled={!items.length} onClick={onClear}>
          Clear All
        </Button>
      </div>

      <label
        className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed px-3 py-4 text-center transition-colors ${
          isDragging ? "border-primary bg-primary-muted" : "border-border hover:border-border-strong hover:bg-surface"
        }`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={(event) => {
          event.preventDefault();
          resetDrag();
          if (event.dataTransfer.files?.length) onAdd(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg,application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) onAdd(event.target.files);
            event.target.value = "";
          }}
        />
        <Upload className="mb-2 h-5 w-5 text-muted" />
        <span className="text-sm font-semibold text-text">Drop {platform.name} labels</span>
        <span className="mt-0.5 text-xs text-muted">or click to browse</span>
      </label>

      <p className="mt-2 text-[11px] font-medium text-muted">
        {items.length} file{items.length === 1 ? "" : "s"}
      </p>

      {items.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {items.map((item) => (
            <article key={item.id} className="relative overflow-hidden rounded-[10px] border border-border bg-preview">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt="" className="aspect-[3/4] w-full object-cover" />
              ) : (
                <div className="grid aspect-[3/4] place-items-center text-[10px] font-semibold text-muted">PDF</div>
              )}
              <span
                className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
                style={{ backgroundColor: platform.accent }}
              >
                {platform.name}
              </span>
              <button
                type="button"
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white"
                aria-label={`Remove ${item.file.name}`}
                onClick={() => onRemove(item.id)}
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-medium text-white">
                {item.file.name}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function ManifestWorkspace() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [files, setFiles] = useState<Record<PlatformId, UploadItem[]>>({
    amazon: [],
    meesho: [],
    flipkart: [],
  });
  const [rows, setRows] = useState<SkuCount[]>([]);
  const [query, setQuery] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState({
    title: "Waiting for shipping labels.",
    detail: "Drop PNG, JPG, or PDF files into a marketplace tray.",
    error: false,
  });

  useEffect(() => {
    initPdfJsWorker();
  }, []);

  const allFiles = useMemo(
    () => ZONES.flatMap((zone) => files[zone.id].map((item) => ({ ...item, platform: zone.id }))),
    [files],
  );

  const addFiles = useCallback((platform: PlatformId, fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter(isAccepted);
    setFiles((prev) => {
      const existing = new Set(prev[platform].map((item) => fileKey(item.file)));
      const next = [...prev[platform]];
      for (const file of incoming) {
        const key = fileKey(file);
        if (existing.has(key)) continue;
        existing.add(key);
        const item: UploadItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          previewUrl: "",
          kind: fileKind(file),
        };
        next.push(item);
        if (item.kind === "image") {
          item.previewUrl = URL.createObjectURL(file);
        } else {
          pdfThumbnail(file)
            .then((url) => {
              setFiles((current) => ({
                ...current,
                [platform]: current[platform].map((row) => (row.id === item.id ? { ...row, previewUrl: url } : row)),
              }));
            })
            .catch(() => {});
        }
      }
      return { ...prev, [platform]: next };
    });
    setStatus({
      title: "Files ready",
      detail: "Press Process Labels to read SKU IDs and piece counts.",
      error: false,
    });
  }, []);

  const clearPlatform = (platform: PlatformId) => {
    setFiles((prev) => {
      for (const item of prev[platform]) {
        if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
      }
      return { ...prev, [platform]: [] };
    });
  };

  const removeFile = (platform: PlatformId, id: string) => {
    setFiles((prev) => {
      const item = prev[platform].find((row) => row.id === id);
      if (item?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
      return { ...prev, [platform]: prev[platform].filter((row) => row.id !== id) };
    });
  };

  const filtered = rows.filter((row) => {
    if (!query.trim()) return true;
    return row.sku.toLowerCase().includes(query.trim().toLowerCase());
  });

  const totalPieces = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);

  async function processLabels() {
    if (!allFiles.length || isProcessing) return;
    setIsProcessing(true);
    setProgress(4);
    setStatus({
      title: "Reading SKU IDs…",
      detail: "Each shipping label counts as 1. Matching SKU IDs are added together.",
      error: false,
    });

    let worker: Awaited<ReturnType<typeof createOcrWorker>> | null = null;
    try {
      worker = await createOcrWorker();
      const collected: SkuCount[] = [];

      for (let i = 0; i < allFiles.length; i += 1) {
        const item = allFiles[i];
        setStatus({
          title: "Reading SKU IDs…",
          detail: `${getPlatform(item.platform).name} · ${item.file.name} (${i + 1} of ${allFiles.length})`,
          error: false,
        });

        if (item.kind === "pdf") {
          const found = await extractSkuCountsFromPdfSmart(item.file, {
            platform: item.platform,
            worker,
            onProgress: (p: { percent?: number }) => {
              setProgress(Math.round(i * (100 / allFiles.length) + ((p.percent || 0) / 100) * (100 / allFiles.length)));
            },
          });
          collected.push(...found);
        } else {
          const [ocr] = await extractSkuFromImages([item.file], { platform: item.platform, worker });
          collected.push(...skuCountsFromOcrResult(ocr, item.platform));
        }
        setProgress(Math.round(((i + 1) / allFiles.length) * 100));
      }

      const aggregated = aggregateSkuCounts(collected);
      setRows(aggregated);
      if (!aggregated.length) {
        setStatus({
          title: "No SKU IDs found",
          detail: "Check that the files are Amazon, Meesho, or Flipkart labels. You can add a row and type the SKU.",
          error: true,
        });
      } else {
        const pieces = aggregated.reduce((sum, row) => sum + row.quantity, 0);
        setStatus({
          title: "SKU count ready",
          detail: `${collected.length} shipping label${collected.length === 1 ? "" : "s"} · ${pieces} total count · ${aggregated.length} SKU${aggregated.length === 1 ? "" : "s"}.`,
          error: collected.length !== pieces,
        });
      }
    } catch (error) {
      setStatus({
        title: "Could not read these labels",
        detail: error instanceof Error ? error.message : "Check the files and try again.",
        error: true,
      });
    } finally {
      if (worker) await terminateOcrWorker(worker);
      setIsProcessing(false);
    }
  }

  function downloadCsv() {
    const lines = [
      "SKU ID,Count",
      ...rows.map((row) => `"${row.sku.replace(/"/g, '""')}",${Number(row.quantity) || 0}`),
      `"Total",${totalPieces}`,
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sku-count-${dispatchDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pageSize = { width: 595.28, height: 841.89 };
    const margin = 40;
    const skuWidth = 360;

    let page = pdf.addPage([pageSize.width, pageSize.height]);
    let y = pageSize.height - margin;
    const drawHeader = (pageNumber: number) => {
      page.drawText("SKU Count", { x: margin, y: y - 18, size: 20, font: bold, color: rgb(0.05, 0.07, 0.12) });
      page.drawText(`${sellerName || "Seller"}  ·  ${dispatchDate}`, {
        x: margin,
        y: y - 38,
        size: 10,
        font,
        color: rgb(0.25, 0.3, 0.38),
      });
      page.drawText(`${rows.length} SKUs  ·  ${totalPieces} pcs  ·  Page ${pageNumber}`, {
        x: pageSize.width - margin - 220,
        y: y - 18,
        size: 9,
        font,
        color: rgb(0.25, 0.3, 0.38),
      });
      y -= 64;
      page.drawRectangle({
        x: margin,
        y: y - 6,
        width: pageSize.width - margin * 2,
        height: 24,
        color: rgb(0.93, 0.95, 0.98),
      });
      page.drawText("SKU ID", { x: margin + 10, y: y + 2, size: 10, font: bold, color: rgb(0.2, 0.24, 0.3) });
      page.drawText("Count", { x: margin + skuWidth + 10, y: y + 2, size: 10, font: bold, color: rgb(0.2, 0.24, 0.3) });
      y -= 18;
    };

    drawHeader(1);
    rows.forEach((row) => {
      if (y < margin + 48) {
        page = pdf.addPage([pageSize.width, pageSize.height]);
        y = pageSize.height - margin;
        drawHeader(pdf.getPageCount());
      }
      let sku = String(row.sku || "").replace(/[^\x20-\x7E]/g, " ");
      while (sku && font.widthOfTextAtSize(sku, 11) > skuWidth - 16) sku = sku.slice(0, -1);
      page.drawText(sku, { x: margin + 10, y, size: 11, font, color: rgb(0.08, 0.1, 0.14) });
      page.drawText(String(Number(row.quantity) || 0), {
        x: margin + skuWidth + 10,
        y,
        size: 11,
        font: bold,
        color: rgb(0.08, 0.1, 0.14),
      });
      y -= 22;
    });

    if (y < margin + 36) {
      page = pdf.addPage([pageSize.width, pageSize.height]);
      y = pageSize.height - margin - 24;
    }
    page.drawText("Total pieces", { x: margin + 10, y, size: 11, font: bold, color: rgb(0.08, 0.1, 0.14) });
    page.drawText(String(totalPieces), {
      x: margin + skuWidth + 10,
      y,
      size: 11,
      font: bold,
      color: rgb(0.08, 0.1, 0.14),
    });

    const bytes = await pdf.save();
    const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sku-count-${dispatchDate}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePlatformId="amazon" mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-xl lg:px-6">
          <div className="flex items-center gap-3">
            <MobileMenuButton onClick={() => setMobileOpen(true)} />
            <div>
              <h1 className="text-sm font-semibold text-text">Manifest Creator</h1>
              <p className="hidden text-xs text-muted sm:block">SKU ID and total piece count from Amazon, Meesho, and Flipkart labels</p>
            </div>
            <ToolHeaderTabs platformId="amazon" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" disabled={!rows.length} onClick={downloadCsv}>
              <FileText className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button size="sm" disabled={!rows.length} onClick={downloadPdf}>
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-5">
          <div className="mx-auto max-w-[1200px] space-y-4">
            <div className="grid gap-3 lg:grid-cols-3">
              {ZONES.map((zone) => (
                <PlatformZone
                  key={zone.id}
                  zone={zone}
                  items={files[zone.id]}
                  onAdd={(list) => addFiles(zone.id, list)}
                  onClear={() => clearPlatform(zone.id)}
                  onRemove={(id) => removeFile(zone.id, id)}
                />
              ))}
            </div>

            <section className="panel-card p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-muted">
                  Seller / warehouse
                  <input
                    className="mt-1 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm text-text"
                    value={sellerName}
                    onChange={(event) => setSellerName(event.target.value)}
                    placeholder="Your business name"
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Dispatch date
                  <input
                    type="date"
                    className="mt-1 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm text-text"
                    value={dispatchDate}
                    onChange={(event) => setDispatchDate(event.target.value)}
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-muted">
                For Flipkart, only the first line of the SKU ID cell is used, with QTY from the QTY column. Each label counts as 1.
              </p>
              <Button className="mt-3 w-full" disabled={!allFiles.length || isProcessing} onClick={processLabels}>
                {isProcessing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Process Labels
              </Button>
              {isProcessing && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </section>

            <section className="panel-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className={`text-sm font-semibold ${status.error ? "text-danger" : "text-text"}`}>{status.title}</p>
                  <p className="text-xs text-muted">{status.detail}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-sm font-semibold">{rows.length}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted">SKUs</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{totalPieces}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted">Total count</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                <input
                  className="min-h-9 flex-1 rounded-[10px] border border-border bg-background px-3 text-sm"
                  placeholder="Filter SKU ID…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Button variant="ghost" size="sm" onClick={() => setRows((prev) => [...prev, emptySkuCount()])}>
                  Add SKU
                </Button>
              </div>
              <div className="overflow-auto">
                {filtered.length === 0 ? (
                  <div className="grid min-h-[280px] place-items-center text-sm font-medium text-muted">
                    SKU ID and count appear here after you process labels
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-card text-[10px] uppercase tracking-wide text-muted">
                      <tr>
                        <th className="w-12 px-4 py-2">#</th>
                        <th className="px-4 py-2">SKU ID</th>
                        <th className="w-28 px-4 py-2 text-right">Count</th>
                        <th className="w-12 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, index) => {
                        const realIndex = rows.indexOf(row);
                        return (
                          <tr key={`${row.sku}-${index}`} className="border-t border-border">
                            <td className="px-4 py-2 text-muted">{realIndex + 1}</td>
                            <td className="px-4 py-2">
                              <input
                                className="w-full bg-transparent py-1 font-medium text-text outline-none"
                                value={row.sku}
                                onChange={(event) => {
                                  const next = [...rows];
                                  next[realIndex] = { ...next[realIndex], sku: event.target.value };
                                  setRows(next);
                                }}
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                min={1}
                                className="w-full bg-transparent py-1 text-right font-semibold text-text outline-none"
                                value={row.quantity}
                                onChange={(event) => {
                                  const next = [...rows];
                                  const quantity = Math.max(1, Number(event.target.value) || 1);
                                  next[realIndex] = { ...next[realIndex], quantity };
                                  setRows(next);
                                }}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                className="rounded-md p-1 text-muted hover:bg-surface hover:text-danger"
                                aria-label="Remove SKU"
                                onClick={() => setRows((prev) => prev.filter((_, i) => i !== realIndex))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-surface/60 font-semibold">
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2">Total</td>
                        <td className="px-4 py-2 text-right">{totalPieces}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
