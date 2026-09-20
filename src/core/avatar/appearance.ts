/**
 * Bridge between the avatar data model and the GPU.
 *
 * Instanced attributes can only carry numbers, so the textile pattern is sent
 * as a code that the character shader switches on. Keeping the mapping here
 * means the shader and the generator can never drift apart.
 */

import { DOPPI_COLORS } from './palettes';
import { AvatarConfig, FabricPattern, HairStyle } from './types';

export const FABRIC_CODES: Record<FabricPattern, number> = {
  none: 0,
  atlas: 1,
  adras: 2,
  ornament: 3,
};

/** Base cloth colour of the agent's doppi; falls back to black when bare-headed. */
export function getDoppiColor(config: AvatarConfig): string {
  return config.doppiStyle ? DOPPI_COLORS[config.doppiStyle] : '#14161A';
}

export function getFabricCode(config: AvatarConfig): number {
  return FABRIC_CODES[config.fabricPattern];
}

/**
 * How far down the back and sides of the head each hairstyle reaches, 0..1.
 *
 * The character mesh carries no hair geometry, so the shader paints hair onto
 * the scalp region instead. This value is what distinguishes a buzz cut from
 * long hair, and it is the reason `hairStyle` has a visible effect at all.
 */
export const HAIR_COVERAGE: Record<HairStyle, number> = {
  buzz_cut: 0.12,
  receding: 0.15,
  short_black: 0.22,
  classic_uzbek: 0.25,
  side_part: 0.28,
  modern_quiff: 0.32,
  tied_bun: 0.45,
  braided: 0.52,
  shoulder_length: 0.6,
  long_wavy: 0.7,
  long_straight: 0.78,
};

export function getHairCoverage(config: AvatarConfig): number {
  return HAIR_COVERAGE[config.hairStyle];
}
