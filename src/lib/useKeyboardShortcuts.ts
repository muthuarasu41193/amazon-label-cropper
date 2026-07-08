"use client";

import { useEffect } from "react";

type ShortcutMap = Record<string, { handler: () => void; label: string }>;

function matchShortcut(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const needsCtrl = parts.includes("ctrl") || parts.includes("cmd");
  const needsShift = parts.includes("shift");
  const needsAlt = parts.includes("alt");

  const ctrl = e.ctrlKey || e.metaKey;
  if (needsCtrl !== ctrl) return false;
  if (needsShift !== e.shiftKey) return false;
  if (needsAlt !== e.altKey) return false;

  return e.key.toLowerCase() === key;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      for (const [combo, { handler }] of Object.entries(shortcuts)) {
        if (matchShortcut(e, combo)) {
          e.preventDefault();
          handler();
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts, enabled]);
}

export const CROP_SHORTCUTS = [
  { combo: "Ctrl+Enter", label: "Crop labels" },
  { combo: "Ctrl+S", label: "Download PDF" },
  { combo: "Ctrl+P", label: "Print" },
  { combo: "Ctrl+O", label: "Open file picker" },
  { combo: "?", label: "Show shortcuts" },
] as const;
