export type Platform = {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  accentRgb: string;
  icon: string;
  category: string;
  defaults: {
    cropPreset: string;
    leftPercent: number;
    marginPercent: number;
    includeInvoiceText: boolean;
    skipBlank: boolean;
  };
  uploadHint: string;
  layoutNote: string;
};

export const PLATFORMS: Record<string, Platform> = {
  amazon: {
    id: "amazon",
    name: "Amazon",
    tagline: "Seller shipping PDFs — 2 labels + invoices per page",
    accent: "#ff9900",
    accentRgb: "255, 153, 0",
    icon: "A",
    category: "marketplace",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      marginPercent: 1,
      includeInvoiceText: true,
      skipBlank: true,
    },
    uploadHint: "Upload the official Amazon multi-label shipping PDF.",
    layoutNote: "Labels on the left, tax invoices on the right (default).",
  },
  flipkart: {
    id: "flipkart",
    name: "Flipkart",
    tagline: "Ekart / Flipkart shipping label sheets",
    accent: "#2874f0",
    accentRgb: "40, 116, 240",
    icon: "F",
    category: "marketplace",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 48,
      marginPercent: 1,
      includeInvoiceText: true,
      skipBlank: true,
    },
    uploadHint: "Upload Flipkart seller panel shipping PDF export.",
    layoutNote: "Most exports use left-column labels with invoice on the right.",
  },
  meesho: {
    id: "meesho",
    name: "Meesho",
    tagline: "Supplier shipping labels from Meesho panel",
    accent: "#9f2089",
    accentRgb: "159, 32, 137",
    icon: "M",
    category: "marketplace",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 52,
      marginPercent: 0.75,
      includeInvoiceText: true,
      skipBlank: true,
    },
    uploadHint: "Upload Meesho bulk shipping label PDF.",
    layoutNote: "Adjust left width if labels look clipped on your template.",
  },
  shopify: {
    id: "shopify",
    name: "Shopify",
    tagline: "Shopify Shipping / third-party label PDFs",
    accent: "#95bf47",
    accentRgb: "149, 191, 71",
    icon: "Sh",
    category: "dtc",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      marginPercent: 0.5,
      includeInvoiceText: false,
      skipBlank: false,
    },
    uploadHint: "Upload Shopify or app-generated multi-label PDF.",
    layoutNote: "DTC PDFs vary — try top-half or source size if needed.",
  },
  generic: {
    id: "generic",
    name: "Universal",
    tagline: "Any 2-label-per-page PDF — full manual control",
    accent: "#14b8a6",
    accentRgb: "20, 184, 166",
    icon: "∞",
    category: "utility",
    defaults: {
      cropPreset: "left-half",
      leftPercent: 50,
      marginPercent: 1,
      includeInvoiceText: true,
      skipBlank: true,
    },
    uploadHint: "Upload any marketplace or courier multi-label PDF.",
    layoutNote: "Pick the source layout that matches your file.",
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

export function getPlatform(id: string): Platform {
  return PLATFORMS[id] ?? PLATFORMS.generic;
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
};
