"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText } from "lucide-react";
import { useDragState } from "@/lib/useDragOver";
import { readFileWithProgress } from "@/lib/readFileWithProgress";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDragging, onDragEnter, onDragLeave, onDragOver, resetDrag } = useDragState();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState("");

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return;

      setUploadingName(file.name);
      setUploadProgress(0);
      await readFileWithProgress(file, setUploadProgress);

      const url = URL.createObjectURL(file);
      sessionStorage.setItem("pendingPdf", url);
      sessionStorage.setItem("pendingPdfName", file.name);
      router.push("/crop");
    },
    [router],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      resetDrag();
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile, resetDrag],
  );

  const isLoading = uploadProgress !== null;

  return (
    <div id="upload" className="w-full scroll-mt-24">
      <label
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`group flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed px-6 py-10 transition-all duration-200 sm:min-h-[240px] ${
          isDragging
            ? "drag-active border-primary bg-primary/8 shadow-[var(--shadow-glow)] ring-2 ring-primary/20"
            : "border-border bg-card/60 hover:border-primary/30 hover:shadow-[var(--shadow-soft-md)]"
        } ${isLoading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={isLoading}
          onChange={(e) => handleFile(e.target.files?.[0])}
          aria-label="Upload shipping label PDF"
        />

        <div
          className={`mb-5 flex h-12 w-12 items-center justify-center rounded-[11px] transition-all duration-200 ${
            isDragging
              ? "scale-110 bg-primary text-white shadow-[var(--shadow-glow)]"
              : "border border-border bg-surface text-primary"
          }`}
        >
          <Upload className={`h-5 w-5 ${isDragging ? "animate-bounce" : ""}`} strokeWidth={1.75} />
        </div>

        {isLoading ? (
          <div className="w-full max-w-xs">
            <p className="mb-3 text-center text-sm font-medium text-text">Reading {uploadingName}…</p>
            <ProgressBar value={uploadProgress} striped showPercent={false} />
          </div>
        ) : (
          <>
            <p className="text-center text-base font-semibold tracking-tight text-text sm:text-lg">
              {isDragging ? "Drop to upload" : "Drop your shipping label PDF here"}
            </p>
            <p className="mt-2 max-w-md text-center text-sm text-muted">
              or click to browse — processing happens entirely in your browser
            </p>
            <span className="btn-press mt-5 inline-flex items-center gap-2 rounded-[11px] border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-all hover:border-border-strong">
              <FileText className="h-4 w-4 text-muted" />
              Choose PDF file
            </span>
          </>
        )}
      </label>
    </div>
  );
}
