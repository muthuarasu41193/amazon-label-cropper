"use client";

import { Download, Printer } from "lucide-react";

type DownloadBarProps = {
  onDownload: () => void;
  onPrint: () => void;
  disabled: boolean;
  labelCount?: number;
};

export function DownloadBar({ onDownload, onPrint, disabled, labelCount }: DownloadBarProps) {
  return (
    <div className="flex items-center gap-2">
      {labelCount !== undefined && labelCount > 0 && (
        <span className="hidden text-xs text-muted sm:inline">
          {labelCount} label{labelCount !== 1 ? "s" : ""} ready
        </span>
      )}
      <button
        type="button"
        onClick={onPrint}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-text hover:bg-surface disabled:opacity-40"
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Print</span>
      </button>
      <button
        type="button"
        onClick={onDownload}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </button>
    </div>
  );
}
