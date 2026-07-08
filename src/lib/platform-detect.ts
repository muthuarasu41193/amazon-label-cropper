/**
 * Content-based detection of Amazon / Flipkart / Meesho shipping-label PDFs.
 * Scores platform-specific text markers from the PDF text layer.
 */

export type DetectedPlatform = "amazon" | "flipkart" | "meesho" | null;

type PlatformScore = {
  id: DetectedPlatform;
  score: number;
};

const AMAZON_MARKERS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bamazon\.in\b/i, weight: 4 },
  { pattern: /\bamazon\s+logistics\b/i, weight: 4 },
  { pattern: /\bamzl\b/i, weight: 3 },
  { pattern: /\beatspl\b/i, weight: 5 },
  { pattern: /\bfba\b/i, weight: 2 },
  { pattern: /\beasy\s*ship\b/i, weight: 3 },
  { pattern: /\bseller\s+central\b/i, weight: 2 },
  { pattern: /\bamazon\b/i, weight: 1 },
];

const FLIPKART_MARKERS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bflipkart\b/i, weight: 4 },
  { pattern: /\bekart\b/i, weight: 4 },
  { pattern: /\bfkip\b/i, weight: 3 },
  { pattern: /\be-kart\b/i, weight: 3 },
  { pattern: /\bflipkart\.com\b/i, weight: 4 },
  { pattern: /\bseller\s+hub\b/i, weight: 2 },
];

const MEESHO_MARKERS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bmeesho\b/i, weight: 5 },
  { pattern: /\bvalmo\b/i, weight: 3 },
  { pattern: /\bmeesho\.com\b/i, weight: 4 },
  { pattern: /\bsupplier\s+panel\b/i, weight: 2 },
  { pattern: /\bsub[\s-]?order\b/i, weight: 1 },
];

function scoreMarkers(text: string, markers: Array<{ pattern: RegExp; weight: number }>) {
  let score = 0;
  for (const marker of markers) {
    if (marker.pattern.test(text)) score += marker.weight;
  }
  return score;
}

/** Score marketplace identity from concatenated page text. */
export function scorePlatformFromText(text: string): PlatformScore[] {
  const normalized = text.replace(/\s+/g, " ");
  return [
    { id: "amazon", score: scoreMarkers(normalized, AMAZON_MARKERS) },
    { id: "flipkart", score: scoreMarkers(normalized, FLIPKART_MARKERS) },
    { id: "meesho", score: scoreMarkers(normalized, MEESHO_MARKERS) },
  ];
}

/**
 * Pick the best platform when confidence clears the threshold.
 * Returns null when markers are ambiguous or absent.
 */
export function detectPlatformFromText(text: string, minScore = 3): DetectedPlatform {
  const scores = scorePlatformFromText(text).sort((a, b) => b.score - a.score);
  const best = scores[0];
  const second = scores[1];

  if (!best || best.score < minScore) return null;
  if (second && best.score - second.score < 2 && second.score >= minScore) return null;
  return best.id;
}

/** Platforms that support automatic content-based detection. */
export const AUTO_DETECTABLE_PLATFORMS = ["amazon", "flipkart", "meesho", "generic"] as const;

export function shouldAutoDetectPlatform(platformId: string) {
  return (AUTO_DETECTABLE_PLATFORMS as readonly string[]).includes(platformId);
}
