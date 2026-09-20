/**
 * Colour and option pools for the avatar generator.
 *
 * Tones are chosen to sit in a realistic Central Asian range rather than a
 * generic cartoon palette, and the fabric colours come from real khan-atlas and
 * adras dyeing traditions (vivid, high-contrast for atlas; earthier and more
 * muted for adras).
 */

import {
  BeardStyle,
  BodyType,
  DoppiStyle,
  FaceType,
  FemaleHairStyle,
  MaleHairStyle,
  Personality,
} from './types';

/** Realistic skin tones, light → deep. */
export const SKIN_TONES = [
  '#F0D2B4',
  '#E8C39E',
  '#DDB18C',
  '#CE9E76',
  '#BC8A62',
  '#A87550',
  '#96633F',
] as const;

/** Brown-dominant iris colours; blue/green are intentionally absent. */
export const EYE_COLORS = [
  '#5A3A22', // brown
  '#3E2415', // dark brown
  '#2A1810', // near-black brown
  '#7B5B33', // hazel
  '#6B4A2A', // amber brown
] as const;

/** Hair colours, black-dominant, with greying options for older avatars. */
export const HAIR_COLORS_DARK = ['#1A1412', '#2B1F1A', '#3B2A20', '#4E372A', '#5C4433'] as const;
export const HAIR_COLORS_GREYING = ['#6E6259', '#7D7269'] as const;
export const HAIR_COLORS_GREY = ['#8A8078', '#9A928B'] as const;

export const FACE_TYPES: readonly FaceType[] = [
  'oval',
  'round',
  'square',
  'long',
  'angular',
  'heart',
];

export const MALE_HAIR_STYLES: readonly MaleHairStyle[] = [
  'short_black',
  'side_part',
  'buzz_cut',
  'modern_quiff',
  'classic_uzbek',
  'receding',
];

export const FEMALE_HAIR_STYLES: readonly FemaleHairStyle[] = [
  'long_straight',
  'shoulder_length',
  'tied_bun',
  'braided',
  'long_wavy',
];

export const BEARD_STYLES: readonly BeardStyle[] = [
  'clean_shaven',
  'light_stubble',
  'short_beard',
  'medium_beard',
  'mustache',
];

export const BODY_TYPES: readonly BodyType[] = ['slim', 'average', 'athletic', 'sturdy', 'heavy'];

export const PERSONALITIES: readonly Personality[] = [
  'calm',
  'energetic',
  'analytical',
  'warm',
  'meticulous',
  'bold',
  'thoughtful',
];

export const DOPPI_STYLES: readonly DoppiStyle[] = [
  'black_chust',
  'white',
  'patterned_green',
  'patterned_gold',
  'modern_black',
];

/** Base cloth colour of each doppi, used by the fabric texture generator. */
export const DOPPI_COLORS: Record<DoppiStyle, string> = {
  black_chust: '#14161A',
  white: '#F2EFE6',
  patterned_green: '#1E5E42',
  patterned_gold: '#8C6A1E',
  modern_black: '#1A1A1E',
};

/** Ornament thread colour per doppi style — Chust doppi is famously white-on-black. */
export const DOPPI_ORNAMENT_COLORS: Record<DoppiStyle, string> = {
  black_chust: '#F5F2EA',
  white: '#1C2530',
  patterned_green: '#E4C97A',
  patterned_gold: '#2C2415',
  modern_black: '#5A5F6B',
};

/** Vivid khan-atlas dye colours. */
export const ATLAS_COLORS = ['#C1272D', '#E8A020', '#1E7B4F', '#5B2C83', '#0F5C8C'] as const;

/** Earthier adras colours. */
export const ADRAS_COLORS = ['#8C4A2F', '#A6702A', '#3E6B4A', '#6B3F5E', '#2F5470'] as const;

export const BUSINESS_COLORS = ['#25303F', '#33383D', '#404A57', '#2C3E50', '#4A4F55'] as const;

export const CASUAL_COLORS = ['#3F6B8C', '#5C7A5A', '#7A5C5C', '#4A4A5A', '#6B6B4A'] as const;

/** Modern Uzbek: national palette toned down for contemporary tailoring. */
export const MODERN_UZBEK_COLORS = ['#7A3B3F', '#8A6B2E', '#2F5F4A', '#4A3A5E', '#2A4C63'] as const;

/** Height ranges in centimetres, by gender. */
export const HEIGHT_RANGE = {
  male: { min: 166, max: 185 },
  female: { min: 155, max: 173 },
} as const;
