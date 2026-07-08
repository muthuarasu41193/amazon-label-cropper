"use client";

import { Scan, SlidersHorizontal } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { CropSettings } from "@/lib/crop-engine";
import { isTopSplitStrategy, getPlatformLayout } from "@/lib/platform-layouts";
import type { Platform } from "@/lib/platforms";

type CropControlsProps = {
  platform: Platform;
  settings: CropSettings;
  onChange: (settings: CropSettings) => void;
  onProcess: () => void;
  isProcessing: boolean;
  canProcess: boolean;
  progress: number;
  progressLabel: string;
};

export function CropControls({
  platform,
  settings,
  onChange,
  onProcess,
  isProcessing,
  canProcess,
  progress,
  progressLabel,
}: CropControlsProps) {
  const manualMode = !settings.smartScan;
  const profile = getPlatformLayout(platform.id);
  const isTopSplit = isTopSplitStrategy(profile.strategy) || settings.cropPreset === "top-split";

  const update = (partial: Partial<CropSettings>) => onChange({ ...settings, ...partial });

  return (
    <section className="panel-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-text">Crop Controls</h2>
          <p className="text-xs text-muted">
            Preset: {platform.presetLabel}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3">
          <input
            type="checkbox"
            checked={settings.smartScan}
            onChange={(e) => update({ smartScan: e.target.checked })}
            className="mt-0.5 rounded border-border"
          />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-text">
              <Scan className="h-3.5 w-3.5 text-primary" />
              Rigid platform scan
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Official {platform.name} coordinates with ink-boundary scan, barcode checks, and invoice-page removal.
              Amazon / Flipkart / Meesho are also auto-detected from PDF text.
            </p>
          </div>
        </label>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Source layout</label>
          <select
            value={settings.cropPreset}
            onChange={(e) => update({ cropPreset: e.target.value })}
            disabled={settings.smartScan}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text disabled:opacity-50"
          >
            <option value="left-half">Labels left, invoices right (Amazon)</option>
            <option value="top-split">Label on top, invoice below (Flipkart / Meesho)</option>
            <option value="right-half">Labels right, invoices left</option>
            <option value="top-half">Labels on top row (2-column)</option>
            <option value="bottom-half">Labels on bottom row</option>
          </select>
        </div>

        <div className={manualMode ? "" : "opacity-50 pointer-events-none"}>
          {isTopSplit ? (
            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-muted">Label height (top zone)</label>
                <span className="text-xs font-semibold text-text">{settings.labelHeightPercent}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={70}
                step={0.5}
                value={settings.labelHeightPercent}
                onChange={(e) => update({ labelHeightPercent: Number(e.target.value) })}
                disabled={!manualMode}
                className="w-full accent-primary"
              />
            </div>
          ) : (
            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-muted">Label column width</label>
                <span className="text-xs font-semibold text-text">{settings.leftPercent}%</span>
              </div>
              <input
                type="range"
                min={35}
                max={65}
                step={0.5}
                value={settings.leftPercent}
                onChange={(e) => update({ leftPercent: Number(e.target.value) })}
                disabled={!manualMode}
                className="w-full accent-primary"
              />
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-muted">Margin trim</label>
              <span className="text-xs font-semibold text-text">{settings.marginPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={3}
              step={0.05}
              value={settings.marginPercent}
              onChange={(e) => update({ marginPercent: Number(e.target.value) })}
              disabled={!manualMode}
              className="w-full accent-primary"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={settings.skipBlank}
            onChange={(e) => update({ skipBlank: e.target.checked })}
            className="rounded border-border"
          />
          Skip blank and invoice-only pages
        </label>
      </div>

      {isProcessing && (
        <div className="mt-4">
          <ProgressBar value={progress} label={progressLabel} striped />
        </div>
      )}

      <button
        type="button"
        onClick={onProcess}
        disabled={!canProcess || isProcessing}
        className="btn-press mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
      >
        {isProcessing ? "Processing…" : "Crop labels"}
      </button>
    </section>
  );
}
