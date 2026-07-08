/**
 * Platform-specific label layout profiles derived from official marketplace PDF structures.
 *
 * Amazon India (Seller Central bulk print): 2-up A4 — shipping label LEFT column (~50% width),
 *   tax invoice RIGHT column. Two label+invoice pairs per page (top and bottom halves).
 *
 * Flipkart (Seller Hub / Ekart): A4 vertical split — shipping label TOP (~50% height),
 *   tax invoice BOTTOM (~50% height). One label per page.
 *
 * Meesho (Supplier Panel): A4 vertical split — shipping label TOP (~58% height),
 *   tax invoice BOTTOM (~42% height). One label per page.
 *
 * Output thermal size: 4×6 in (100 × 150 mm) per industry standard for Indian e-commerce.
 */

import type { CropSettings } from "./crop-engine";

export type Box = { left: number; bottom: number; right: number; top: number };
export type Pair = { labelBox: Box; invoiceBox: Box };

export type LayoutStrategy =
  | "amazon-left-column"
  | "flipkart-top-split"
  | "meesho-top-split"
  | "left-column-2up"
  | "top-split"
  | "auto";

export type PlatformLayoutProfile = {
  strategy: LayoutStrategy;
  /** Column width for left-column layouts (% of page width). */
  labelWidthPercent: number;
  /** Row height for top-split layouts (% of page height). */
  labelHeightPercent: number;
  /** Number of label regions per source page. */
  labelsPerPage: number;
  marginPercent: number;
  /** Official thermal output reference. */
  outputSize: string;
  description: string;
};

/** Official 4×6 thermal label — 100 × 150 mm at 72 DPI. */
export const THERMAL_4X6_MM = { widthMm: 100, heightMm: 150 };

export const PLATFORM_LAYOUTS: Record<string, PlatformLayoutProfile> = {
  amazon: {
    strategy: "amazon-left-column",
    labelWidthPercent: 50,
    labelHeightPercent: 50,
    labelsPerPage: 2,
    marginPercent: 0.5,
    outputSize: "4x6",
    description: "Label left 50%, invoice right 50%, 2-up per A4 page",
  },
  flipkart: {
    strategy: "flipkart-top-split",
    labelWidthPercent: 100,
    labelHeightPercent: 50,
    labelsPerPage: 1,
    marginPercent: 0.5,
    outputSize: "4x6",
    description: "Label top 50%, invoice bottom 50%, full page width",
  },
  meesho: {
    strategy: "meesho-top-split",
    labelWidthPercent: 100,
    labelHeightPercent: 58,
    labelsPerPage: 1,
    marginPercent: 0.5,
    outputSize: "4x6",
    description: "Label top 58%, invoice bottom 42%, full page width",
  },
  ebay: {
    strategy: "left-column-2up",
    labelWidthPercent: 50,
    labelHeightPercent: 50,
    labelsPerPage: 2,
    marginPercent: 1,
    outputSize: "4x6",
    description: "Standard 2-column marketplace layout",
  },
  etsy: {
    strategy: "left-column-2up",
    labelWidthPercent: 50,
    labelHeightPercent: 50,
    labelsPerPage: 2,
    marginPercent: 1,
    outputSize: "4x6",
    description: "Labels left, packing slip right",
  },
  fedex: {
    strategy: "left-column-2up",
    labelWidthPercent: 50,
    labelHeightPercent: 50,
    labelsPerPage: 2,
    marginPercent: 0.5,
    outputSize: "4x8",
    description: "FedEx multi-label side-by-side columns",
  },
  ups: {
    strategy: "left-column-2up",
    labelWidthPercent: 50,
    labelHeightPercent: 50,
    labelsPerPage: 2,
    marginPercent: 0.5,
    outputSize: "4x6",
    description: "UPS 2-per-page column layout",
  },
  dhl: {
    strategy: "left-column-2up",
    labelWidthPercent: 50,
    labelHeightPercent: 50,
    labelsPerPage: 2,
    marginPercent: 0.5,
    outputSize: "4x6",
    description: "DHL multi-label column layout",
  },
  usps: {
    strategy: "left-column-2up",
    labelWidthPercent: 50,
    labelHeightPercent: 50,
    labelsPerPage: 2,
    marginPercent: 0.5,
    outputSize: "4x6",
    description: "USPS 2-per-page letter layout",
  },
  shopify: {
    strategy: "left-column-2up",
    labelWidthPercent: 50,
    labelHeightPercent: 50,
    labelsPerPage: 2,
    marginPercent: 0.5,
    outputSize: "4x6",
    description: "DTC app label sheets",
  },
  woocommerce: {
    strategy: "left-column-2up",
    labelWidthPercent: 50,
    labelHeightPercent: 50,
    labelsPerPage: 2,
    marginPercent: 0.5,
    outputSize: "4x6",
    description: "Plugin label sheets",
  },
  generic: {
    strategy: "auto",
    labelWidthPercent: 50,
    labelHeightPercent: 50,
    labelsPerPage: 2,
    marginPercent: 1,
    outputSize: "4x6",
    description: "Auto-detect layout",
  },
};

export function getPlatformLayout(platformId: string): PlatformLayoutProfile {
  return PLATFORM_LAYOUTS[platformId] ?? PLATFORM_LAYOUTS.generic;
}

export function isTopSplitStrategy(strategy: LayoutStrategy): boolean {
  return strategy === "flipkart-top-split" || strategy === "meesho-top-split" || strategy === "top-split";
}

export function isLeftColumnStrategy(strategy: LayoutStrategy): boolean {
  return strategy === "amazon-left-column" || strategy === "left-column-2up";
}

function marginPx(pageWidth: number, pageHeight: number, marginPercent: number) {
  return Math.min(pageWidth, pageHeight) * (marginPercent / 100);
}

/** Rigid crop boxes based on official marketplace layout coordinates. */
export function rigidBoxesForPage(
  pageWidth: number,
  pageHeight: number,
  profile: PlatformLayoutProfile,
  settings?: Partial<CropSettings>,
): Pair[] {
  const margin = marginPx(pageWidth, pageHeight, settings?.marginPercent ?? profile.marginPercent);

  if (isTopSplitStrategy(profile.strategy)) {
    const labelHeightPct = settings?.labelHeightPercent ?? profile.labelHeightPercent;
    const splitY = pageHeight * (labelHeightPct / 100);

    return [
      {
        labelBox: {
          left: margin,
          bottom: splitY + margin,
          right: pageWidth - margin,
          top: pageHeight - margin,
        },
        invoiceBox: {
          left: margin,
          bottom: margin,
          right: pageWidth - margin,
          top: splitY - margin,
        },
      },
    ];
  }

  // Left-column 2-up layout (Amazon and similar marketplaces).
  const labelWidthPct = settings?.leftPercent ?? profile.labelWidthPercent;
  const labelWidth = pageWidth * (labelWidthPct / 100);
  const invoiceStart = labelWidth;
  const halfH = pageHeight / 2;

  return [
    {
      labelBox: {
        left: margin,
        bottom: halfH + margin,
        right: labelWidth - margin,
        top: pageHeight - margin,
      },
      invoiceBox: {
        left: invoiceStart + margin,
        bottom: halfH + margin,
        right: pageWidth - margin,
        top: pageHeight - margin,
      },
    },
    {
      labelBox: {
        left: margin,
        bottom: margin,
        right: labelWidth - margin,
        top: halfH - margin,
      },
      invoiceBox: {
        left: invoiceStart + margin,
        bottom: margin,
        right: pageWidth - margin,
        top: halfH - margin,
      },
    },
  ];
}

export function applyPlatformLayoutToSettings(
  platformId: string,
  settings: CropSettings,
): CropSettings {
  const profile = getPlatformLayout(platformId);

  let cropPreset = settings.cropPreset;
  if (isTopSplitStrategy(profile.strategy)) {
    cropPreset = "top-split";
  } else if (isLeftColumnStrategy(profile.strategy)) {
    cropPreset = "left-half";
  }

  return {
    ...settings,
    platformId,
    cropPreset,
    leftPercent: profile.labelWidthPercent,
    labelHeightPercent: profile.labelHeightPercent,
    marginPercent: profile.marginPercent,
  };
}
