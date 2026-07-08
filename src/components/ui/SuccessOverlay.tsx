"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

type SuccessOverlayProps = {
  show: boolean;
  title?: string;
  detail?: string;
  onDone?: () => void;
  durationMs?: number;
};

export function SuccessOverlay({
  show,
  title = "Labels ready!",
  detail,
  onDone,
  durationMs = 2200,
}: SuccessOverlayProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => onDone?.(), durationMs);
    return () => clearTimeout(timer);
  }, [show, durationMs, onDone]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
      <div className="success-pop flex flex-col items-center rounded-[var(--radius-card)] border border-border bg-card px-10 py-8 shadow-[var(--shadow-soft-lg)]">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="success-ring absolute inset-0 rounded-full bg-emerald-500/20" />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="success-check h-8 w-8" strokeWidth={2.5} />
          </div>
        </div>
        <p className="mt-4 text-lg font-semibold text-text">{title}</p>
        {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
      </div>
    </div>
  );
}
