"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Platform } from "@/lib/platforms";
import { readFileWithProgress } from "@/lib/readFileWithProgress";
import { useDragState } from "@/lib/useDragOver";

export type UploadPanelHandle = {
  openFilePicker: () => void;
};

type UploadPanelProps = {
  platform: Platform;
  onFilesSelected: (files: FileList | File[]) => void;
  selectedFile: File | null;
  onClearFile: () => void;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const UploadPanel = forwardRef<UploadPanelHandle, UploadPanelProps>(function UploadPanel(
  { platform, onFilesSelected, selectedFile, onClearFile },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDragging, onDragEnter, onDragLeave, onDragOver, resetDrag } = useDragState();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState("");

  useImperativeHandle(ref, () => ({
    openFilePicker: () => inputRef.current?.click(),
  }));

  const ingestFiles = useCallback(
    async (files: FileList | File[]) => {
      const pdfFiles = Array.from(files).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (!pdfFiles.length) return;

      for (let i = 0; i < pdfFiles.length; i += 1) {
        const file = pdfFiles[i];
        setUploadingName(pdfFiles.length > 1 ? `${file.name} (${i + 1}/${pdfFiles.length})` : file.name);
        setUploadProgress(0);
        await readFileWithProgress(file, setUploadProgress);
      }

      setUploadProgress(null);
      setUploadingName("");
      onFilesSelected(pdfFiles);
    },
    [onFilesSelected],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    resetDrag();
    if (e.dataTransfer.files?.length) {
      ingestFiles(e.dataTransfer.files);
    }
  };

  const isLoading = uploadProgress !== null;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text">Upload</h2>
          <p className="mt-0.5 text-xs text-muted">Drag-and-drop or browse PDF files</p>
        </div>
        {selectedFile && !isLoading && (
          <button
            type="button"
            onClick={onClearFile}
            className="btn-press rounded-lg p-1.5 text-muted hover:bg-surface hover:text-text"
            aria-label="Clear file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <label
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={handleDrop}
        className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-all duration-200 ${
          isDragging
            ? "drag-active border-primary bg-primary/10 ring-2 ring-primary/30"
            : "border-border bg-surface hover:border-primary/40 hover:bg-primary/[0.02]"
        } ${isLoading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          disabled={isLoading}
          onChange={(e) => {
            if (e.target.files?.length) ingestFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {isLoading ? (
          <div className="w-full max-w-xs px-2">
            <Upload className="mx-auto mb-3 h-7 w-7 animate-pulse text-primary" />
            <p className="mb-3 text-center text-sm font-medium text-text">Reading {uploadingName}…</p>
            <ProgressBar value={uploadProgress ?? 0} striped showPercent={false} />
          </div>
        ) : (
          <>
            <Upload className={`mb-2.5 h-7 w-7 text-primary ${isDragging ? "animate-bounce" : ""}`} />
            <p className="text-sm font-medium text-text">{isDragging ? "Drop to add files" : "Drop PDF files here"}</p>
            <p className="mt-1 text-xs text-muted">or click to browse · multi-file supported</p>
          </>
        )}
      </label>

      {selectedFile && !isLoading ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `rgba(${platform.accentRgb}, 0.12)` }}
          >
            <FileText className="h-4 w-4" style={{ color: platform.accent }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{selectedFile.name}</p>
            <p className="text-xs text-muted">{formatFileSize(selectedFile.size)}</p>
          </div>
        </div>
      ) : (
        !isLoading && <p className="mt-3 text-xs text-muted">{platform.uploadHint}</p>
      )}
    </section>
  );
});
