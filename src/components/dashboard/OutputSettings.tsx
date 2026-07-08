"use client";

import { Settings2 } from "lucide-react";
import type { CropSettings } from "@/lib/crop-engine";
import {
  applyLabelPreset,
  getLabelPreset,
  LABEL_PRESETS,
  OUTPUT_SIZE_OPTIONS,
  PRESET_GROUPS,
} from "@/lib/label-presets";

type OutputSettingsProps = {
  settings: CropSettings;
  onChange: (settings: CropSettings) => void;
  downloadName: string;
  onDownloadNameChange: (name: string) => void;
  recommendedPresetId?: string;
};

export function OutputSettings({
  settings,
  onChange,
  downloadName,
  onDownloadNameChange,
  recommendedPresetId,
}: OutputSettingsProps) {
  const update = (partial: Partial<CropSettings>) => onChange({ ...settings, ...partial });

  const activePreset = getLabelPreset(settings.labelPreset);
  const isCustom = settings.labelPreset === "custom";

  const selectPreset = (presetId: string) => {
    onChange(applyLabelPreset(presetId));
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-text">Output Settings</h2>
          <p className="text-xs text-muted">Label preset and output dimensions</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Shipping label preset</label>
          <select
            value={settings.labelPreset}
            onChange={(e) => selectPreset(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text"
          >
            {PRESET_GROUPS.map((group) => {
              const presets = Object.values(LABEL_PRESETS).filter((p) => p.group === group.id);
              if (!presets.length) return null;
              return (
                <optgroup key={group.id} label={group.label}>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                      {preset.id === recommendedPresetId ? " (recommended)" : ""}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <p className="mt-1.5 text-xs text-muted">{activePreset.description}</p>
        </div>

        {isCustom && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Width (mm)</label>
              <input
                type="number"
                min={20}
                max={500}
                step={1}
                value={settings.customWidthMm}
                onChange={(e) => update({ customWidthMm: Number(e.target.value), pageSize: "custom" })}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Height (mm)</label>
              <input
                type="number"
                min={20}
                max={500}
                step={1}
                value={settings.customHeightMm}
                onChange={(e) => update({ customHeightMm: Number(e.target.value), pageSize: "custom" })}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Output size</label>
          <select
            value={settings.pageSize}
            onChange={(e) => update({ pageSize: e.target.value })}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text"
          >
            {OUTPUT_SIZE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
            <option value="source">Use cropped label size</option>
            {isCustom && <option value="custom">Custom (mm above)</option>}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Fit mode</label>
          <select
            value={settings.fitMode}
            onChange={(e) => update({ fitMode: e.target.value })}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text"
          >
            <option value="contain">Contain (fit inside)</option>
            <option value="cover">Cover (fill area)</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={settings.includeInvoiceText}
            onChange={(e) => update({ includeInvoiceText: e.target.checked })}
            className="rounded border-border"
          />
          Add product name and quantity
        </label>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Output filename</label>
          <input
            type="text"
            value={downloadName}
            onChange={(e) => onDownloadNameChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text"
            placeholder="labels.pdf"
          />
        </div>
      </div>
    </section>
  );
}
