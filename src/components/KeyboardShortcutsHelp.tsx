"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { CROP_SHORTCUTS } from "@/lib/useKeyboardShortcuts";

type KeyboardShortcutsHelpProps = {
  open: boolean;
  onClose: () => void;
};

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-[var(--shadow-soft-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-2.5">
          {CROP_SHORTCUTS.map((s) => (
            <li key={s.combo} className="flex items-center justify-between text-sm">
              <span className="text-muted">{s.label}</span>
              <kbd className="rounded-lg border border-border bg-surface px-2 py-0.5 font-mono text-xs text-text">
                {s.combo.replace("Ctrl", "⌘/Ctrl")}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
