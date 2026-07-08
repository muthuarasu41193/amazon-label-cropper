"use client";

import { AlertCircle, CheckCircle2, Clock, Loader2, Trash2 } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";

export type QueueItem = {
  id: string;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  progressLabel: string;
  resultBlob?: Blob;
  resultUrl?: string;
  error?: string;
  labelsAdded?: number;
};

type BatchQueueProps = {
  items: QueueItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onProcessAll: () => void;
  isProcessing: boolean;
};

function StatusIcon({ status }: { status: QueueItem["status"] }) {
  switch (status) {
    case "processing":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted" />;
  }
}

export function BatchQueue({ items, activeId, onSelect, onRemove, onProcessAll, isProcessing }: BatchQueueProps) {
  if (items.length === 0) return null;

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text">Batch Queue</h2>
          <p className="text-xs text-muted">
            {items.length} file{items.length !== 1 ? "s" : ""} · {doneCount} done
          </p>
        </div>
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={onProcessAll}
            disabled={isProcessing}
            className="btn-press rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-border/50 disabled:opacity-40"
          >
            Process all
          </button>
        )}
      </div>

      <div className="max-h-[200px] space-y-1.5 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
              activeId === item.id ? "border-primary/30 bg-primary/5" : "border-border bg-surface"
            }`}
          >
            <StatusIcon status={item.status} />
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-xs font-medium text-text">{item.file.name}</p>
              {item.status === "processing" ? (
                <div className="mt-1.5">
                  <ProgressBar value={item.progress} label={item.progressLabel} size="sm" showPercent={false} striped />
                </div>
              ) : (
                <p className="text-[10px] text-muted">
                  {item.status === "done"
                    ? `${item.labelsAdded} labels`
                    : item.status === "error"
                      ? item.error
                      : "Pending"}
                </p>
              )}
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={item.status === "processing"}
              className="btn-press rounded-lg p-1 text-muted hover:bg-card hover:text-red-500 disabled:opacity-40"
              aria-label="Remove from queue"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
