"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText } from "lucide-react";

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return;
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
      setIsDragging(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile],
  );

  return (
    <div id="upload" className="w-full scroll-mt-24">
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={onDrop}
        className={`group flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed px-6 py-12 transition-all sm:min-h-[260px] ${
          isDragging
            ? "border-primary bg-primary/5 shadow-[var(--shadow-soft-lg)]"
            : "border-border bg-surface hover:border-primary/40 hover:shadow-[var(--shadow-soft-md)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div
          className={`mb-5 flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] transition-colors ${
            isDragging ? "bg-primary text-white" : "bg-white text-primary shadow-[var(--shadow-soft)]"
          }`}
        >
          <Upload className="h-6 w-6" strokeWidth={1.75} />
        </div>

        <p className="text-center text-lg font-semibold tracking-tight text-text">
          Drop your shipping label PDF here
        </p>
        <p className="mt-2 max-w-md text-center text-sm text-muted">
          or click to browse — processing happens entirely in your browser
        </p>

        <span className="mt-6 inline-flex items-center gap-2 rounded-[12px] border border-border bg-white px-4 py-2 text-sm font-medium text-text shadow-[var(--shadow-soft)]">
          <FileText className="h-4 w-4 text-muted" />
          Choose PDF file
        </span>
      </label>
    </div>
  );
}
