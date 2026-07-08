"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BatchQueue, type QueueItem } from "@/components/dashboard/BatchQueue";
import { CropControls } from "@/components/dashboard/CropControls";
import { DownloadBar } from "@/components/dashboard/DownloadBar";
import { OutputSettings } from "@/components/dashboard/OutputSettings";
import { PdfPreview } from "@/components/dashboard/PdfPreview";
import { MobileMenuButton, Sidebar } from "@/components/dashboard/Sidebar";
import { UploadPanel, type UploadPanelHandle } from "@/components/dashboard/UploadPanel";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { PlatformLogo } from "@/components/PlatformLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CropDashboardSkeleton } from "@/components/ui/Skeleton";
import { SuccessOverlay } from "@/components/ui/SuccessOverlay";
import { createCroppedPdf, initPdfJsWorker, type CropProgress, type CropSettings } from "@/lib/crop-engine";
import { getPlatform, resolveCropSettingsForPlatform } from "@/lib/platforms";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultSettings(platformId: string): CropSettings {
  return resolveCropSettingsForPlatform(platformId);
}

function CropPageContent() {
  const searchParams = useSearchParams();
  const platformId = searchParams.get("p") ?? "amazon";
  const platform = getPlatform(platformId);

  const uploadRef = useRef<UploadPanelHandle>(null);
  const processingRef = useRef(false);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState<CropSettings>(() => defaultSettings(platformId));
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [status, setStatus] = useState({ title: "Waiting for a PDF.", detail: platform.uploadHint, error: false });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [downloadName, setDownloadName] = useState("labels.pdf");
  const [labelsAdded, setLabelsAdded] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successDetail, setSuccessDetail] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);

  const activeItem = queue.find((item) => item.id === activeId) ?? null;
  const selectedFile = activeItem?.file ?? null;

  useEffect(() => {
    initPdfJsWorker();
  }, []);

  useEffect(() => {
    setSettings(defaultSettings(platformId));
    setStatus({ title: "Waiting for a PDF.", detail: platform.uploadHint, error: false });
  }, [platformId, platform.uploadHint]);

  const resetOutput = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCroppedBlob(null);
    setLabelsAdded(0);
  }, [previewUrl]);

  const addFilesToQueue = useCallback(
    (files: FileList | File[]) => {
      const pdfFiles = Array.from(files).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (!pdfFiles.length) {
        setStatus({ title: "Please choose PDF files", detail: "Only PDF files can be cropped.", error: true });
        return;
      }

      const newItems: QueueItem[] = pdfFiles.map((file) => ({
        id: makeId(),
        file,
        status: "pending",
        progress: 0,
        progressLabel: "Pending",
      }));

      setQueue((prev) => [...prev, ...newItems]);

      if (!activeId) {
        const first = newItems[0];
        setActiveId(first.id);
        resetOutput();
        setDownloadName(first.file.name.replace(/\.pdf$/i, "") + `-${platform.id}-labels.pdf`);
        setStatus({ title: "PDF selected", detail: first.file.name, error: false });
      }
    },
    [activeId, platform.id, resetOutput],
  );

  useEffect(() => {
    const pendingUrl = sessionStorage.getItem("pendingPdf");
    const pendingName = sessionStorage.getItem("pendingPdfName");
    if (!pendingUrl) return;

    setIsSessionLoading(true);
    fetch(pendingUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], pendingName || "upload.pdf", { type: "application/pdf" });
        addFilesToQueue([file]);
        sessionStorage.removeItem("pendingPdf");
        sessionStorage.removeItem("pendingPdfName");
        URL.revokeObjectURL(pendingUrl);
      })
      .catch(() => {
        sessionStorage.removeItem("pendingPdf");
        sessionStorage.removeItem("pendingPdfName");
      })
      .finally(() => setIsSessionLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for session handoff
  }, []);

  const selectQueueItem = useCallback(
    (id: string) => {
      const item = queue.find((q) => q.id === id);
      if (!item) return;

      setActiveId(id);
      resetOutput();

      if (item.status === "done" && item.resultBlob && item.resultUrl) {
        setCroppedBlob(item.resultBlob);
        setPreviewUrl(item.resultUrl);
        setLabelsAdded(item.labelsAdded ?? 0);
        setDownloadName(item.file.name.replace(/\.pdf$/i, "") + `-${platform.id}-labels.pdf`);
        setStatus({
          title: "Cropped PDF ready",
          detail: `${item.labelsAdded} labels from ${item.file.name}.`,
          error: false,
        });
      } else {
        setDownloadName(item.file.name.replace(/\.pdf$/i, "") + `-${platform.id}-labels.pdf`);
        setStatus({ title: "PDF selected", detail: item.file.name, error: false });
      }
    },
    [queue, platform.id, resetOutput],
  );

  const removeQueueItem = useCallback(
    (id: string) => {
      setQueue((prev) => {
        const item = prev.find((q) => q.id === id);
        if (item?.resultUrl) URL.revokeObjectURL(item.resultUrl);
        const next = prev.filter((q) => q.id !== id);
        if (activeId === id) {
          const replacement = next[0];
          if (replacement) {
            setTimeout(() => selectQueueItem(replacement.id), 0);
          } else {
            setActiveId(null);
            resetOutput();
            setStatus({ title: "Waiting for a PDF.", detail: platform.uploadHint, error: false });
          }
        }
        return next;
      });
    },
    [activeId, platform.uploadHint, resetOutput, selectQueueItem],
  );

  const updateQueueItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const processFile = useCallback(
    async (item: QueueItem) => {
      setActiveId(item.id);
      resetOutput();
      setIsProcessing(true);
      setProgress(0);
      setProgressLabel("Loading PDF…");
      setStatus({ title: "Cropping labels…", detail: item.file.name, error: false });

      updateQueueItem(item.id, { status: "processing", progress: 0, progressLabel: "Loading PDF…" });

      const onProgress = (p: CropProgress) => {
        setProgress(p.percent);
        const label =
          p.phase === "scanning"
            ? `Scanning page ${p.page ?? ""} of ${p.total ?? ""}…`
            : p.phase === "cropping"
              ? `Cropping page ${p.page ?? ""} of ${p.total ?? ""}…`
              : p.phase === "loading"
                ? "Loading PDF…"
                : "Finishing…";
        setProgressLabel(label);
        updateQueueItem(item.id, { progress: p.percent, progressLabel: label });
      };

      try {
        const { outputBytes, pageCount, labelsAdded: count } = await createCroppedPdf(item.file, settings, onProgress);
        const blob = new Blob([Uint8Array.from(outputBytes)], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        updateQueueItem(item.id, {
          status: "done",
          progress: 100,
          progressLabel: "Done",
          resultBlob: blob,
          resultUrl: url,
          labelsAdded: count,
        });

        setCroppedBlob(blob);
        setPreviewUrl(url);
        setLabelsAdded(count);
        setDownloadName(item.file.name.replace(/\.pdf$/i, "") + `-${platform.id}-labels.pdf`);
        setStatus({
          title: "Cropped PDF ready",
          detail: `${count} labels from ${pageCount} source pages.`,
          error: false,
        });
        setSuccessDetail(`${count} labels from ${pageCount} source pages`);
        setShowSuccess(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Check the file and settings, then try again.";
        updateQueueItem(item.id, { status: "error", progress: 0, progressLabel: "Failed", error: message });
        setStatus({ title: "Could not crop this PDF", detail: message, error: true });
      } finally {
        setIsProcessing(false);
      }
    },
    [platform.id, resetOutput, settings, updateQueueItem],
  );

  const cropPdf = useCallback(() => {
    if (!activeItem || isProcessing) return;
    processFile(activeItem);
  }, [activeItem, isProcessing, processFile]);

  const processAll = async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    const pending = queue.filter((item) => item.status === "pending" || item.status === "error");
    for (const item of pending) {
      await processFile(item);
    }

    processingRef.current = false;
  };

  const downloadPdf = useCallback(() => {
    if (!croppedBlob) return;
    const url = URL.createObjectURL(croppedBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    link.click();
    URL.revokeObjectURL(url);
  }, [croppedBlob, downloadName]);

  const printPdf = useCallback(() => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, "_blank");
    win?.addEventListener("load", () => win.print());
  }, [previewUrl]);

  const clearActiveFile = () => {
    if (activeId) removeQueueItem(activeId);
  };

  const shortcuts = useMemo(
    () => ({
      "ctrl+enter": { handler: cropPdf, label: "Crop labels" },
      "ctrl+s": { handler: downloadPdf, label: "Download PDF" },
      "ctrl+p": { handler: printPdf, label: "Print" },
      "ctrl+o": { handler: () => uploadRef.current?.openFilePicker(), label: "Open file picker" },
      "?": { handler: () => setShortcutsOpen(true), label: "Show shortcuts" },
    }),
    [cropPdf, downloadPdf, printPdf],
  );

  useKeyboardShortcuts(shortcuts, !shortcutsOpen);

  if (isSessionLoading) {
    return <CropDashboardSkeleton />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePlatformId={platformId} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <MobileMenuButton onClick={() => setMobileOpen(true)} />
            <PlatformLogo id={platform.id} className="h-8 w-8" />
            <div>
              <h1 className="text-sm font-semibold text-text">{platform.name} Label Cropper</h1>
              <p className="hidden text-xs text-muted sm:block">{platform.layoutNote}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="btn-press hidden rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-text sm:inline-flex"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>
            <ThemeToggle />
            <DownloadBar
              onDownload={downloadPdf}
              onPrint={printPdf}
              disabled={!croppedBlob}
              labelCount={labelsAdded}
            />
          </div>
        </header>

        <main className="flex flex-1 overflow-hidden">
          <div
            key={platformId}
            className="page-enter w-full overflow-y-auto border-r border-border bg-panel p-4 lg:w-[380px] lg:shrink-0 lg:p-5"
          >
            <div className="space-y-4">
              <UploadPanel
                ref={uploadRef}
                platform={platform}
                onFilesSelected={addFilesToQueue}
                selectedFile={selectedFile}
                onClearFile={clearActiveFile}
              />
              <CropControls
                platform={platform}
                settings={settings}
                onChange={setSettings}
                onProcess={cropPdf}
                isProcessing={isProcessing}
                canProcess={!!selectedFile}
                progress={progress}
                progressLabel={progressLabel}
              />
              <OutputSettings
                settings={settings}
                onChange={setSettings}
                downloadName={downloadName}
                onDownloadNameChange={setDownloadName}
                recommendedPresetId={platform.recommendedPresetId}
              />
              <BatchQueue
                items={queue}
                activeId={activeId}
                onSelect={selectQueueItem}
                onRemove={removeQueueItem}
                onProcessAll={processAll}
                isProcessing={isProcessing}
              />
            </div>
          </div>

          <div className="hidden flex-1 p-5 lg:block">
            <PdfPreview
              sourceFile={selectedFile}
              outputUrl={previewUrl}
              statusTitle={status.title}
              statusDetail={status.detail}
              isError={status.error}
            />
          </div>
        </main>

        <div className="border-t border-border p-4 lg:hidden">
          <PdfPreview
            sourceFile={selectedFile}
            outputUrl={previewUrl}
            statusTitle={status.title}
            statusDetail={status.detail}
            isError={status.error}
          />
        </div>
      </div>

      <SuccessOverlay
        show={showSuccess}
        title="Labels ready!"
        detail={successDetail}
        onDone={() => setShowSuccess(false)}
      />
      <KeyboardShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

export default function CropPage() {
  return (
    <Suspense fallback={<CropDashboardSkeleton />}>
      <CropPageContent />
    </Suspense>
  );
}
