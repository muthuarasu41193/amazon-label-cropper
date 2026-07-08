import type { CropSettings } from "./crop-engine";

export type LabelPreset = {
  id: string;
  name: string;
  description: string;
  group: "size" | "printer" | "platform" | "custom";
  settings: CropSettings;
};

export const MM_PER_INCH = 25.4;
export const PT_PER_INCH = 72;

export function mmToPoints(mm: number): number {
  return (mm / MM_PER_INCH) * PT_PER_INCH;
}

/** Output page dimensions in PDF points (72 DPI). */
export const PAGE_SIZES: Record<string, { width: number; height: number; label: string }> = {
  "4x6": { width: 288, height: 432, label: "4 × 6 in (100 × 150 mm)" },
  "4x6-mm": { width: mmToPoints(100), height: mmToPoints(150), label: "100 × 150 mm" },
  a6: { width: 298, height: 420, label: "A6" },
  a4: { width: 595.28, height: 841.89, label: "A4" },
  letter: { width: 612, height: 792, label: "Letter (8.5 × 11 in)" },
  "8x11": { width: 576, height: 792, label: "8 × 11 in" },
  "4x8": { width: 288, height: 576, label: "4 × 8 in" },
};

export const OUTPUT_SIZE_OPTIONS = Object.entries(PAGE_SIZES).map(([id, size]) => ({
  id,
  label: size.label,
}));

const base = (
  overrides: Partial<CropSettings> & Pick<CropSettings, "pageSize">,
): CropSettings => ({
  platformId: "generic",
  cropPreset: "left-half",
  leftPercent: 50,
  labelHeightPercent: 50,
  marginPercent: 1,
  fitMode: "contain",
  skipBlank: true,
  includeInvoiceText: false,
  smartScan: true,
  labelPreset: "4x6",
  customWidthMm: 100,
  customHeightMm: 150,
  ...overrides,
});

export const LABEL_PRESETS: Record<string, LabelPreset> = {
  "4x6": {
    id: "4x6",
    name: "4×6 (100×150 mm)",
    description: "Standard thermal shipping label",
    group: "size",
    settings: base({ labelPreset: "4x6", pageSize: "4x6" }),
  },
  a4: {
    id: "a4",
    name: "A4",
    description: "ISO A4 sheet for office printers",
    group: "size",
    settings: base({ labelPreset: "a4", pageSize: "a4", marginPercent: 0.5, smartScan: false }),
  },
  letter: {
    id: "letter",
    name: "Letter",
    description: "US Letter (8.5 × 11 in)",
    group: "size",
    settings: base({ labelPreset: "letter", pageSize: "letter", marginPercent: 0.5, smartScan: false }),
  },
  "8x11": {
    id: "8x11",
    name: "8×11",
    description: "8 × 11 in sheet — common USPS bulk layout",
    group: "size",
    settings: base({ labelPreset: "8x11", pageSize: "8x11", marginPercent: 0.5 }),
  },
  thermal: {
    id: "thermal",
    name: "Thermal printer",
    description: "4×6 thermal output with auto-crop and blank skip",
    group: "printer",
    settings: base({
      labelPreset: "thermal",
      pageSize: "4x6",
      marginPercent: 0.75,
      skipBlank: true,
      smartScan: true,
    }),
  },
  zebra: {
    id: "zebra",
    name: "Zebra preset",
    description: "Zebra thermal printers — tight 4×6 fit",
    group: "printer",
    settings: base({
      labelPreset: "zebra",
      pageSize: "4x6",
      marginPercent: 0.35,
      fitMode: "contain",
      skipBlank: true,
      smartScan: true,
    }),
  },
  "amazon-india": {
    id: "amazon-india",
    name: "Amazon India",
    description: "A4 enlarged labels with compact SKU | Qty overlay (no label shrink)",
    group: "platform",
    settings: base({
      labelPreset: "amazon-india",
      pageSize: "a4",
      leftPercent: 50,
      marginPercent: 0.35,
      includeInvoiceText: true,
      skipBlank: true,
      smartScan: true,
    }),
  },
  "amazon-us": {
    id: "amazon-us",
    name: "Amazon US",
    description: "Amazon.com FBA and seller central 2-up labels",
    group: "platform",
    settings: base({
      labelPreset: "amazon-us",
      pageSize: "a4",
      leftPercent: 50,
      marginPercent: 0.35,
      includeInvoiceText: true,
      skipBlank: true,
      smartScan: true,
    }),
  },
  ebay: {
    id: "ebay",
    name: "eBay",
    description: "eBay Seller Hub bulk label sheets",
    group: "platform",
    settings: base({
      labelPreset: "ebay",
      pageSize: "4x6",
      marginPercent: 1,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    }),
  },
  shopify: {
    id: "shopify",
    name: "Shopify",
    description: "Shopify Shipping and DTC app label PDFs",
    group: "platform",
    settings: base({
      labelPreset: "shopify",
      pageSize: "4x6",
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: false,
      smartScan: false,
    }),
  },
  fedex: {
    id: "fedex",
    name: "FedEx",
    description: "FedEx Ship Manager multi-label PDFs",
    group: "platform",
    settings: base({
      labelPreset: "fedex",
      pageSize: "4x8",
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    }),
  },
  ups: {
    id: "ups",
    name: "UPS",
    description: "UPS WorldShip and online shipping exports",
    group: "platform",
    settings: base({
      labelPreset: "ups",
      pageSize: "4x6",
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    }),
  },
  dhl: {
    id: "dhl",
    name: "DHL",
    description: "DHL Express and eCommerce label PDFs",
    group: "platform",
    settings: base({
      labelPreset: "dhl",
      pageSize: "4x6",
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    }),
  },
  custom: {
    id: "custom",
    name: "Custom dimensions",
    description: "Set your own label width and height in millimeters",
    group: "custom",
    settings: base({
      labelPreset: "custom",
      pageSize: "custom",
      customWidthMm: 100,
      customHeightMm: 150,
      marginPercent: 0.5,
      smartScan: false,
    }),
  },
};

export const PRESET_GROUPS = [
  { id: "size", label: "Paper sizes" },
  { id: "printer", label: "Printer presets" },
  { id: "platform", label: "Platform presets" },
  { id: "custom", label: "Custom" },
] as const;

export const PRESET_LIST = Object.values(LABEL_PRESETS);

export function getLabelPreset(id: string): LabelPreset {
  return LABEL_PRESETS[id] ?? LABEL_PRESETS["4x6"];
}

export function applyLabelPreset(presetId: string, current?: Partial<CropSettings>): CropSettings {
  const preset = getLabelPreset(presetId);
  return {
    ...preset.settings,
    ...current,
    labelPreset: presetId,
  };
}

export function resolveOutputSize(settings: CropSettings): { width: number; height: number } | null {
  if (settings.pageSize === "source") return null;
  if (settings.pageSize === "custom") {
    return {
      width: mmToPoints(settings.customWidthMm),
      height: mmToPoints(settings.customHeightMm),
    };
  }
  return PAGE_SIZES[settings.pageSize] ?? PAGE_SIZES["4x6"];
}
