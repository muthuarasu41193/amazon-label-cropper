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
        className={`group flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed px-6 py-12 transition-all duration-200 sm:min-h-[260px] ${
          isDragging
            ? "drag-active border-primary bg-primary/10 shadow-[var(--shadow-soft-lg)] ring-2 ring-primary/30"
            : "border-border bg-surface hover:border-primary/40 hover:shadow-[var(--shadow-soft-md)]"
        } ${isLoading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={isLoading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div
          className={`mb-5 flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] transition-all duration-200 ${
            isDragging ? "scale-110 bg-primary text-white" : "bg-card text-primary shadow-[var(--shadow-soft)]"
          }`}
        >
          <Upload className={`h-6 w-6 ${isDragging ? "animate-bounce" : ""}`} strokeWidth={1.75} />
        </div>

        {isLoading ? (
          <div className="w-full max-w-xs">
            <p className="mb-3 text-center text-sm font-medium text-text">Reading {uploadingName}…</p>
            <ProgressBar value={uploadProgress} striped showPercent={false} />
          </div>
        ) : (
          <>
            <p className="text-center text-lg font-semibold tracking-tight text-text">
              {isDragging ? "Drop to upload" : "Drop your shipping label PDF here"}
            </p>
            <p className="mt-2 max-w-md text-center text-sm text-muted">
              or click to browse — processing happens entirely in your browser
            </p>
            <span className="btn-press mt-6 inline-flex items-center gap-2 rounded-[12px] border border-border bg-card px-4 py-2 text-sm font-medium text-text shadow-[var(--shadow-soft)] transition-transform">
              <FileText className="h-4 w-4 text-muted" />
              Choose PDF file
            </span>
          </>
        )}
      </label>
    </div>
  );
}
