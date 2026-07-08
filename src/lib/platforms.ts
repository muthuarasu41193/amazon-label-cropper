import { applyLabelPreset } from "./label-presets";
import { applyPlatformLayoutToSettings } from "./platform-layouts";
import type { CropSettings } from "./crop-engine";

export type Platform = {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  accentRgb: string;
  icon: string;
  category: string;
  labelSizes: string[];
  presetLabel: string;
  recommendedPresetId: string;
  defaults: {
    cropPreset: string;
    leftPercent: number;
    labelHeightPercent: number;
    marginPercent: number;
    includeInvoiceText: boolean;
    skipBlank: boolean;
    smartScan: boolean;
  };
  uploadHint: string;
  layoutNote: string;
};

export const PLATFORMS: Record<string, Platform> = {
  amazon: {
    id: "amazon",
    name: "Amazon",
    tagline: "Split 2-up seller shipping PDFs with invoice columns into individual thermal labels.",
    accent: "#ff9900",
    accentRgb: "255, 153, 0",
    icon: "A",
    category: "marketplace",
    labelSizes: ["4×6", "A6"],
    presetLabel: "Amazon India · left column",
    recommendedPresetId: "amazon-india",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      labelHeightPercent: 50,
      marginPercent: 0.5,
      includeInvoiceText: true,
      skipBlank: true,
      smartScan: true,
    },
    uploadHint: "Upload the official Amazon multi-label shipping PDF.",
    layoutNote: "Shipping label on the left (50%), tax invoice on the right — 2 labels per A4 page.",
  },
  ebay: {
    id: "ebay",
    name: "eBay",
    tagline: "Crop eBay shipping label sheets from bulk print exports into 4×6 thermal pages.",
    accent: "#e53238",
    accentRgb: "229, 50, 56",
    icon: "e",
    category: "marketplace",
    labelSizes: ["4×6", "4×8"],
    presetLabel: "eBay · left-half split",
    recommendedPresetId: "ebay",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      labelHeightPercent: 50,
      marginPercent: 1,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    },
    uploadHint: "Upload eBay bulk shipping label PDF from Seller Hub.",
    layoutNote: "Most eBay exports use a 2-column layout — adjust if columns are reversed.",
  },
  shopify: {
    id: "shopify",
    name: "Shopify",
    tagline: "Shopify Shipping and app-generated multi-label PDFs, tuned for DTC workflows.",
    accent: "#95bf47",
    accentRgb: "149, 191, 71",
    icon: "Sh",
    category: "dtc",
    labelSizes: ["4×6", "A6"],
    presetLabel: "Shopify · no invoice",
    recommendedPresetId: "shopify",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      labelHeightPercent: 50,
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: false,
      smartScan: false,
    },
    uploadHint: "Upload Shopify or app-generated multi-label PDF.",
    layoutNote: "DTC PDFs vary — try top-half or source size if needed.",
  },
  woocommerce: {
    id: "woocommerce",
    name: "WooCommerce",
    tagline: "WooCommerce and plugin label PDFs — split 2-up sheets for thermal printers.",
    accent: "#7f54b3",
    accentRgb: "127, 84, 179",
    icon: "W",
    category: "dtc",
    labelSizes: ["4×6", "A6"],
    presetLabel: "WooCommerce · thermal",
    recommendedPresetId: "thermal",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      labelHeightPercent: 50,
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: false,
      smartScan: false,
    },
    uploadHint: "Upload WooCommerce shipping label PDF from your plugin or carrier app.",
    layoutNote: "Plugin exports differ — switch to top-half if labels stack vertically.",
  },
  etsy: {
    id: "etsy",
    name: "Etsy",
    tagline: "Etsy shipping label bulk prints with packing slip columns removed automatically.",
    accent: "#f1641e",
    accentRgb: "241, 100, 30",
    icon: "E",
    category: "marketplace",
    labelSizes: ["4×6"],
    presetLabel: "Etsy · invoice text",
    recommendedPresetId: "thermal",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      labelHeightPercent: 50,
      marginPercent: 1,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    },
    uploadHint: "Upload Etsy bulk shipping label PDF from the orders page.",
    layoutNote: "Labels left, order details right — standard Etsy 2-up layout.",
  },
  flipkart: {
    id: "flipkart",
    name: "Flipkart",
    tagline: "Ekart and Flipkart seller panel exports — label on top, invoice removed.",
    accent: "#2874f0",
    accentRgb: "40, 116, 240",
    icon: "F",
    category: "marketplace",
    labelSizes: ["4×6", "A6"],
    presetLabel: "Flipkart · top split",
    recommendedPresetId: "amazon-india",
    defaults: {
      cropPreset: "top-split",
      leftPercent: 100,
      labelHeightPercent: 50,
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    },
    uploadHint: "Upload Flipkart seller panel shipping PDF export.",
    layoutNote: "Shipping label on top (50%), tax invoice on the bottom — invoice removed automatically.",
  },
  meesho: {
    id: "meesho",
    name: "Meesho",
    tagline: "Meesho supplier bulk shipping labels cropped for everyday thermal printing.",
    accent: "#9f2089",
    accentRgb: "159, 32, 137",
    icon: "M",
    category: "marketplace",
    labelSizes: ["4×6", "A6"],
    presetLabel: "Meesho · top split",
    recommendedPresetId: "amazon-india",
    defaults: {
      cropPreset: "top-split",
      leftPercent: 100,
      labelHeightPercent: 58,
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    },
    uploadHint: "Upload Meesho bulk shipping label PDF.",
    layoutNote: "Shipping label on top (58%), tax invoice on the bottom — invoice removed automatically.",
  },
  fedex: {
    id: "fedex",
    name: "FedEx",
    tagline: "FedEx Ship Manager and bulk label PDFs sized for 4×6 thermal output.",
    accent: "#4d148c",
    accentRgb: "77, 20, 140",
    icon: "Fx",
    category: "carrier",
    labelSizes: ["4×6", "4×8"],
    presetLabel: "FedEx · 4×8 thermal",
    recommendedPresetId: "fedex",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      labelHeightPercent: 50,
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    },
    uploadHint: "Upload FedEx bulk shipping label PDF.",
    layoutNote: "Multi-label FedEx PDFs often use side-by-side columns.",
  },
  ups: {
    id: "ups",
    name: "UPS",
    tagline: "UPS WorldShip and online shipping label sheets ready for thermal printers.",
    accent: "#351c15",
    accentRgb: "53, 28, 21",
    icon: "UP",
    category: "carrier",
    labelSizes: ["4×6"],
    presetLabel: "UPS · thermal 4×6",
    recommendedPresetId: "ups",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      labelHeightPercent: 50,
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    },
    uploadHint: "Upload UPS bulk shipping label PDF.",
    layoutNote: "Try top-half if your export stacks labels vertically.",
  },
  dhl: {
    id: "dhl",
    name: "DHL",
    tagline: "DHL Express and eCommerce label PDFs with carrier-tuned crop margins.",
    accent: "#ffcc00",
    accentRgb: "255, 204, 0",
    icon: "DHL",
    category: "carrier",
    labelSizes: ["4×6", "A6"],
    presetLabel: "DHL · thermal 4×6",
    recommendedPresetId: "dhl",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      labelHeightPercent: 50,
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    },
    uploadHint: "Upload DHL bulk shipping label PDF.",
    layoutNote: "International DHL labels may need margin tweaks for barcodes.",
  },
  usps: {
    id: "usps",
    name: "USPS",
    tagline: "USPS Click-N-Ship and Stamps.com multi-label PDFs cropped to 4×6.",
    accent: "#004b87",
    accentRgb: "0, 75, 135",
    icon: "US",
    category: "carrier",
    labelSizes: ["4×6", "4×8"],
    presetLabel: "USPS · Letter sheet",
    recommendedPresetId: "8x11",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      labelHeightPercent: 50,
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    },
    uploadHint: "Upload USPS bulk shipping label PDF.",
    layoutNote: "USPS PDFs are often 2-per-page on letter size.",
  },
  generic: {
    id: "generic",
    name: "Other / Custom PDF",
    tagline: "Any 2-label-per-page PDF with full manual control over layout and output size.",
    accent: "#14b8a6",
    accentRgb: "20, 184, 166",
    icon: "∞",
    category: "utility",
    labelSizes: ["4×6", "A6", "Source"],
    presetLabel: "Manual · custom",
    recommendedPresetId: "custom",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      labelHeightPercent: 50,
      marginPercent: 1,
      includeInvoiceText: false,
      skipBlank: true,
      smartScan: true,
    },
    uploadHint: "Upload any marketplace or courier multi-label PDF.",
    layoutNote: "Pick the source layout that matches your file.",
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

export const SUPPORTED_PLATFORM_IDS = [
  "amazon",
  "ebay",
  "shopify",
  "woocommerce",
  "etsy",
  "flipkart",
  "meesho",
  "fedex",
  "ups",
  "dhl",
  "usps",
  "generic",
] as const;

export function getPlatform(id: string): Platform {
  return PLATFORMS[id] ?? PLATFORMS.generic;
}

export function resolveCropSettingsForPlatform(platformId: string): CropSettings {
  const platform = getPlatform(platformId);
  const settings = applyLabelPreset(platform.recommendedPresetId);

  const withPlatformDefaults: CropSettings = {
    ...settings,
    platformId,
    cropPreset: platform.defaults.cropPreset,
    leftPercent: platform.defaults.leftPercent,
    labelHeightPercent: platform.defaults.labelHeightPercent,
    marginPercent: platform.defaults.marginPercent,
    includeInvoiceText: platform.defaults.includeInvoiceText,
    skipBlank: platform.defaults.skipBlank,
    smartScan: platform.defaults.smartScan,
  };

  return applyPlatformLayoutToSettings(platformId, withPlatformDefaults);
}

export const FEATURED_PLATFORMS = [
  "amazon",
  "ebay",
  "shopify",
  "woocommerce",
  "etsy",
  "flipkart",
  "meesho",
  "dhl",
  "fedex",
  "ups",
  "usps",
] as const;

export const SIDEBAR_GROUPS = [
  {
    label: "Marketplaces",
    platforms: ["amazon", "ebay", "shopify", "woocommerce", "etsy", "flipkart", "meesho"] as const,
  },
  {
    label: "Carriers",
    platforms: ["fedex", "ups", "dhl", "usps"] as const,
  },
  {
    label: "Other",
    platforms: ["generic"] as const,
  },
] as const;

export const SIDEBAR_LABELS: Record<string, string> = {
  generic: "Custom PDF",
};

export const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  amazon: "Amazon",
  ebay: "eBay",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  etsy: "Etsy",
  flipkart: "Flipkart",
  meesho: "Meesho",
  dhl: "DHL",
  fedex: "FedEx",
  ups: "UPS",
  usps: "USPS",
  generic: "Other / Custom PDF",
};
