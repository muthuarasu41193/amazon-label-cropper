"use client";

import { Settings2 } from "lucide-react";
import type { CropSettings } from "@/lib/crop-engine";

type OutputSettingsProps = {
  settings: CropSettings;
  onChange: (settings: CropSettings) => void;
  downloadName: string;
  onDownloadNameChange: (name: string) => void;
};

export function OutputSettings({ settings, onChange, downloadName, onDownloadNameChange }: OutputSettingsProps) {
  const update = (partial: Partial<CropSettings>) => onChange({ ...settings, ...partial });

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-text">Output Settings</h2>
          <p className="text-xs text-muted">Configure thermal label output</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Output size</label>
          <select
            value={settings.pageSize}
            onChange={(e) => update({ pageSize: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text"
          >
            <option value="4x6">4 × 6 in thermal label</option>
            <option value="source">Use cropped label size</option>
            <option value="a6">A6 page</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Fit mode</label>
          <select
            value={settings.fitMode}
            onChange={(e) => update({ fitMode: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text"
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
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text"
            placeholder="labels.pdf"
          />
        </div>
      </div>
    </section>
  );
}
