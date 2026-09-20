/**
 * Small colour helpers used to keep generated avatars readable.
 *
 * The character model has no separate garment mesh, so skin and clothing sit
 * directly against each other. Without a contrast floor the generator can hand
 * an agent a shirt that matches their skin tone, which reads as unclothed.
 */

/** Parses `#rrggbb` into 0..1 sRGB components. */
export function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}

/** WCAG relative luminance. */
export function relativeLuminance(hex: string): number {
  const linear = parseHex(hex).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** Perceptual distance, good enough for "are these too similar?". */
export function colorDistance(a: string, b: string): number {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  // Weighted to match human sensitivity, then Euclidean.
  return Math.sqrt(2 * (ar - br) ** 2 + 4 * (ag - bg) ** 2 + 3 * (ab - bb) ** 2);
}

/** Minimum separation required between adjacent regions (skin vs cloth, hair vs skin). */
export const MIN_CONTRAST = 0.35;

export function hasEnoughContrast(a: string, b: string): boolean {
  return colorDistance(a, b) >= MIN_CONTRAST;
}
