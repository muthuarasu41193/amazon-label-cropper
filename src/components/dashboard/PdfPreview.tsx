"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import { initPdfJsWorker } from "@/lib/crop-engine";

type PdfPreviewProps = {
  sourceFile: File | null;
  outputUrl: string | null;
  statusTitle: string;
  statusDetail: string;
  isError: boolean;
};

type PreviewTab = "source" | "output";

export function PdfPreview({ sourceFile, outputUrl, statusTitle, statusDetail, isError }: PdfPreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>(outputUrl ? "output" : "source");
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

  useEffect(() => {
    if (outputUrl) setActiveTab("output");
  }, [outputUrl]);

  useEffect(() => {
    setPageNum(1);
    setZoom(100);
    setRotation(0);
  }, [sourceFile, activeTab]);

  const renderSourcePage = useCallback(async () => {
    if (activeTab !== "source" || !sourceFile || !canvasRef.current) return;

    setRendering(true);
    try {
      initPdfJsWorker();
      const bytes = await sourceFile.arrayBuffer();
      if (pdfDocRef.current) {
        await pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
      const doc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      pdfDocRef.current = doc;
      setPageCount(doc.numPages);

      const page = await doc.getPage(pageNum);
      const scale = (zoom / 100) * 1.5;
      const viewport = page.getViewport({ scale, rotation });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch {
      // Preview unavailable for encrypted or corrupt PDFs
    } finally {
      setRendering(false);
    }
  }, [activeTab, sourceFile, pageNum, zoom, rotation]);

  useEffect(() => {
    renderSourcePage();
    return () => {
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
    };
  }, [renderSourcePage]);

  const zoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const rotate = () => setRotation((r) => (r + 90) % 360);
  const resetView = () => {
    setZoom(100);
    setRotation(0);
  };

  return (
    <section className="flex h-full min-h-[480px] flex-col rounded-[var(--radius-card)] border border-border bg-white shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className={`text-sm font-medium ${isError ? "text-red-600" : "text-text"}`}>{statusTitle}</p>
          <p className="mt-0.5 text-xs text-muted">{statusDetail}</p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-surface p-1">
          <button
            type="button"
            onClick={() => setActiveTab("source")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "source" ? "bg-white text-text shadow-sm" : "text-muted hover:text-text"
            }`}
          >
            Source
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("output")}
            disabled={!outputUrl}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
              activeTab === "output" ? "bg-white text-text shadow-sm" : "text-muted hover:text-text"
            }`}
          >
            Output
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-4 py-2">
        <button
          type="button"
          onClick={zoomOut}
          disabled={activeTab === "output"}
          className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-text disabled:opacity-40"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center text-xs font-medium text-text">{zoom}%</span>
        <button
          type="button"
          onClick={zoomIn}
          disabled={activeTab === "output"}
          className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-text disabled:opacity-40"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={rotate}
          disabled={activeTab === "output"}
          className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-text disabled:opacity-40"
          aria-label="Rotate"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          disabled={activeTab === "output"}
          className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-text disabled:opacity-40"
          aria-label="Reset view"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {activeTab === "source" && pageCount > 1 && (
          <>
            <div className="mx-1 h-4 w-px bg-border" />
            <button
              type="button"
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
              disabled={pageNum <= 1}
              className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-text disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted">
              {pageNum} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPageNum((p) => Math.min(pageCount, p + 1))}
              disabled={pageNum >= pageCount}
              className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-text disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="relative flex-1 overflow-auto bg-[#f3f4f6] p-4">
        {activeTab === "output" && outputUrl ? (
          <iframe
            src={outputUrl}
            title="Cropped PDF preview"
            className="mx-auto h-full min-h-[420px] w-full max-w-2xl rounded-xl border border-border bg-white shadow-sm"
          />
        ) : sourceFile ? (
          <div className="flex justify-center">
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-muted">
                Rendering preview…
              </div>
            )}
            <canvas ref={canvasRef} className="rounded-xl border border-border bg-white shadow-sm" />
          </div>
        ) : (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <ZoomIn className="h-6 w-6 text-muted" />
            </div>
            <p className="text-sm font-medium text-text">Live PDF preview</p>
            <p className="mt-1 max-w-xs text-xs text-muted">Upload a PDF to see a real-time source preview with zoom and rotate controls.</p>
          </div>
        )}
      </div>
    </section>
  );
}
