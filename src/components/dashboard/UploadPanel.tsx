"use client";

import { useRef } from "react";
import { FileText, Upload, X } from "lucide-react";
import type { Platform } from "@/lib/platforms";

type UploadPanelProps = {
  platform: Platform;
  isDragging: boolean;
  onDragState: (dragging: boolean) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  selectedFile: File | null;
  onClearFile: () => void;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadPanel({
  platform,
  isDragging,
  onDragState,
  onFilesSelected,
  selectedFile,
  onClearFile,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragState(false);
    if (e.dataTransfer.files?.length) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text">Upload</h2>
          <p className="mt-0.5 text-xs text-muted">Drag-and-drop or browse PDF files</p>
        </div>
        {selectedFile && (
          <button
            type="button"
            onClick={onClearFile}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-text"
            aria-label="Clear file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <label
        onDragEnter={(e) => {
          e.preventDefault();
          onDragState(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => onDragState(false)}
        onDrop={handleDrop}
        className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-surface hover:border-primary/40 hover:bg-primary/[0.02]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) onFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="mb-2.5 h-7 w-7 text-primary" />
        <p className="text-sm font-medium text-text">Drop PDF files here</p>
        <p className="mt-1 text-xs text-muted">or click to browse · multi-file supported</p>
      </label>

      {selectedFile ? (
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
        <p className="mt-3 text-xs text-muted">{platform.uploadHint}</p>
      )}
    </section>
  );
}
