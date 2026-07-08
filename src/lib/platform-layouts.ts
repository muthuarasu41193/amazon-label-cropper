/**
 * Platform-specific label layout profiles derived from marketplace PDF structures.
 *
 * Amazon India (Seller Central / ATSPL bulk print):
 *   A4 sheet (~210×297 mm). Shipping label LEFT column (~48–52% width ≈ 100–105 mm),
 *   tax invoice RIGHT column. Typically 2 label+invoice pairs per page (top & bottom),
 *   each pair ≈ 4×6 in (100×150 mm) — the industry thermal size.
 *   Some Single/Easy Ship exports place ONE label (top-left) with invoice or blank below.
 *
 * Flipkart (Seller Hub / Ekart):
 *   A4 vertical split — shipping label TOP (~50% / ~148.5 mm), tax invoice BOTTOM.
 *   One label per page. Newer Seller Hub also supports native 3×5 / 4×6 thermal.
 *
 * Meesho (Supplier Panel):
 *   A4 vertical split — shipping label TOP (~58–62% / ~172–184 mm of A4),
 *   tax invoice BOTTOM (~38–42%). One label per page.
 *
 * Output thermal size: 4×6 in (100 × 150 mm) per Indian e-commerce standard.
 *
 * PDF coordinates use bottom-left origin. For top-split, "labelHeightPercent" means the
 * height of the TOP band: labelBottom = pageHeight * (1 - labelHeightPercent/100).
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
  /** Height of the TOP label band for top-split layouts (% of page height). */
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

/** A4 page in points (72 DPI). */
export const A4_POINTS = { width: 595.28, height: 841.89 };

/**
 * Amazon India A4 integrated label: left column is ~100 mm on a 210 mm sheet → ~47.6%.
 * Use 50% as the safe default; boundary refinement tightens against ink later.
 */
export const AMAZON_LABEL_WIDTH_PERCENT = 50;

/**
 * Flipkart Seller Hub A4: label typically occupies the upper half.
 */
export const FLIPKART_LABEL_HEIGHT_PERCENT = 50;

/**
 * Meesho Supplier Panel A4: label typically occupies the upper ~60% (barcode + address + QR).
 * Research sources cite 55–65%; 60% is the midpoint that keeps the full shipping band.
 */
export const MEESHO_LABEL_HEIGHT_PERCENT = 60;

export const PLATFORM_LAYOUTS: Record<string, PlatformLayoutProfile> = {
  amazon: {
    strategy: "amazon-left-column",
    labelWidthPercent: AMAZON_LABEL_WIDTH_PERCENT,
    labelHeightPercent: 50,
    labelsPerPage: 2,
    marginPercent: 0.35,
    outputSize: "4x6",
    description: "Label left ~50% (~100 mm), invoice right, 2-up per A4 (or 1-up when bottom empty)",
  },
  flipkart: {
    strategy: "flipkart-top-split",
    labelWidthPercent: 100,
    labelHeightPercent: FLIPKART_LABEL_HEIGHT_PERCENT,
    labelsPerPage: 1,
    marginPercent: 0.35,
    outputSize: "4x6",
    description: "Label top 50%, invoice bottom 50%, full page width",
  },
  meesho: {
    strategy: "meesho-top-split",
    labelWidthPercent: 100,
    labelHeightPercent: MEESHO_LABEL_HEIGHT_PERCENT,
    labelsPerPage: 1,
    marginPercent: 0.35,
    outputSize: "4x6",
    description: "Label top 60%, invoice bottom 40%, full page width",
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

/**
 * Convert top-band height % → PDF Y of the label/invoice split.
 * labelHeightPercent is the portion of the page measured from the TOP.
 * PDF bottom-left: label occupies [splitY, pageHeight]; invoice occupies [0, splitY].
 */
export function topSplitY(pageHeight: number, labelHeightPercent: number) {
  const pct = Math.min(95, Math.max(5, labelHeightPercent));
  return pageHeight * (1 - pct / 100);
}

/** Build top-split label + invoice boxes for Flipkart / Meesho style pages. */
export function topSplitBoxes(
  pageWidth: number,
  pageHeight: number,
  labelHeightPercent: number,
  marginPercent: number,
): Pair[] {
  const margin = marginPx(pageWidth, pageHeight, marginPercent);
  const splitY = topSplitY(pageHeight, labelHeightPercent);

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
        top: Math.max(margin, splitY - margin),
      },
    },
  ];
}

/** Build left-column 2-up (or N-up) Amazon-style pairs. */
export function leftColumnBoxes(
  pageWidth: number,
  pageHeight: number,
  labelWidthPercent: number,
  marginPercent: number,
  labelsPerPage = 2,
): Pair[] {
  const margin = marginPx(pageWidth, pageHeight, marginPercent);
  const labelWidth = pageWidth * (Math.min(70, Math.max(30, labelWidthPercent)) / 100);
  const invoiceStart = labelWidth;
  const rowH = pageHeight / Math.max(1, labelsPerPage);
  const pairs: Pair[] = [];

  // Rows from top to bottom (PDF: high Y → low Y).
  for (let row = 0; row < labelsPerPage; row += 1) {
    const top = pageHeight - row * rowH - margin;
    const bottom = pageHeight - (row + 1) * rowH + margin;
    pairs.push({
      labelBox: {
        left: margin,
        bottom,
        right: labelWidth - margin,
        top,
      },
      invoiceBox: {
        left: invoiceStart + margin,
        bottom,
        right: pageWidth - margin,
        top,
      },
    });
  }

  return pairs;
}

/**
 * Amazon 1-up fallback: only the top-left label band (bottom half may be blank or
 * a full-width invoice page handled separately).
 */
export function amazonSingleLabelBoxes(
  pageWidth: number,
  pageHeight: number,
  labelWidthPercent: number,
  marginPercent: number,
): Pair[] {
  const margin = marginPx(pageWidth, pageHeight, marginPercent);
  const labelWidth = pageWidth * (Math.min(70, Math.max(30, labelWidthPercent)) / 100);
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
        left: labelWidth + margin,
        bottom: halfH + margin,
        right: pageWidth - margin,
        top: pageHeight - margin,
      },
    },
  ];
}

/** Rigid crop boxes based on marketplace layout coordinates. */
export function rigidBoxesForPage(
  pageWidth: number,
  pageHeight: number,
  profile: PlatformLayoutProfile,
  settings?: Partial<CropSettings>,
): Pair[] {
  const marginPercent = settings?.marginPercent ?? profile.marginPercent;

  if (isTopSplitStrategy(profile.strategy)) {
    const labelHeightPct = settings?.labelHeightPercent ?? profile.labelHeightPercent;
    return topSplitBoxes(pageWidth, pageHeight, labelHeightPct, marginPercent);
  }

  const labelWidthPct = settings?.leftPercent ?? profile.labelWidthPercent;
  return leftColumnBoxes(pageWidth, pageHeight, labelWidthPct, marginPercent, profile.labelsPerPage);
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
