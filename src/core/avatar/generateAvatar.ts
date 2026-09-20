/**
 * Deterministic avatar generation.
 *
 * `generateAvatar` is a pure function of the agent's seed (its `id` unless a
 * regeneration stored an explicit `avatarSeed`) plus any user overrides. The
 * same input always yields the same person, which is what lets the app persist
 * only a short seed instead of a full appearance record.
 */

import {
  ADRAS_COLORS,
  ATLAS_COLORS,
  BODY_TYPES,
  BUSINESS_COLORS,
  CASUAL_COLORS,
  DOPPI_ORNAMENT_COLORS,
  DOPPI_STYLES,
  EYE_COLORS,
  FACE_TYPES,
  FEMALE_HAIR_STYLES,
  HAIR_COLORS_DARK,
  HAIR_COLORS_GREY,
  HAIR_COLORS_GREYING,
  HEIGHT_RANGE,
  MALE_HAIR_STYLES,
  MODERN_UZBEK_COLORS,
  SKIN_TONES,
} from './palettes';
import { colorDistance, hasEnoughContrast } from './color';
import { createRng } from './random';
import { inferRoleArchetype, ROLE_BIASES } from './roles';
import {
  AgeGroup,
  AvatarConfig,
  AvatarOverrides,
  BeardStyle,
  BodyType,
  ClothingStyle,
  DoppiStyle,
  FabricPattern,
  Gender,
  HairStyle,
} from './types';

/**
 * The minimum an agent must expose to receive an avatar. Deliberately looser
 * than `AgentNode` so the same generator can serve the user node, previews and
 * the editor without dragging in agent internals.
 */
export interface AvatarSubject {
  id: string;
  name?: string;
  description?: string;
  /** Brand colour from the flow graph; reused as the avatar's primary colour. */
  color?: string;
  /** Set once an avatar has been regenerated; otherwise the id is the seed. */
  avatarSeed?: string;
  avatar?: AvatarOverrides;
}

/** Share of male avatars when nothing is pinned. Kept at a balanced split. */
const MALE_PROBABILITY = 0.5;

/** Share of male avatars that wear a doppi ("katta qismida do'ppi bo'lsin"). */
const DOPPI_PROBABILITY = 0.75;

const HAIR_COLOR_WEIGHTS_BY_AGE: Record<AgeGroup, [readonly string[], number][]> = {
  young: [[HAIR_COLORS_DARK, 20], [HAIR_COLORS_GREYING, 0.4], [HAIR_COLORS_GREY, 0]],
  adult: [[HAIR_COLORS_DARK, 18], [HAIR_COLORS_GREYING, 2], [HAIR_COLORS_GREY, 0]],
  middle_aged: [[HAIR_COLORS_DARK, 11], [HAIR_COLORS_GREYING, 7], [HAIR_COLORS_GREY, 2]],
  senior: [[HAIR_COLORS_DARK, 3], [HAIR_COLORS_GREYING, 7], [HAIR_COLORS_GREY, 10]],
};

const BEARD_WEIGHTS_BY_AGE: Record<AgeGroup, [BeardStyle, number][]> = {
  young: [['clean_shaven', 4], ['light_stubble', 4], ['short_beard', 2], ['medium_beard', 1], ['mustache', 0.5]],
  adult: [['clean_shaven', 3], ['light_stubble', 3], ['short_beard', 3], ['medium_beard', 2], ['mustache', 1]],
  middle_aged: [['clean_shaven', 2], ['light_stubble', 2], ['short_beard', 3], ['medium_beard', 3], ['mustache', 2.5]],
  senior: [['clean_shaven', 2], ['light_stubble', 1], ['short_beard', 2], ['medium_beard', 3], ['mustache', 3]],
};

const BODY_WEIGHTS_BY_AGE: Record<AgeGroup, [BodyType, number][]> = {
  young: [['slim', 4], ['average', 4], ['athletic', 3], ['sturdy', 1], ['heavy', 0.5]],
  adult: [['slim', 2], ['average', 4], ['athletic', 3], ['sturdy', 2], ['heavy', 1]],
  middle_aged: [['slim', 1], ['average', 3], ['athletic', 2], ['sturdy', 3], ['heavy', 2]],
  senior: [['slim', 1.5], ['average', 3], ['athletic', 1], ['sturdy', 3], ['heavy', 2]],
};

/**
 * Which textile a clothing style can be made of. National dress carries real
 * atlas/adras patterning; business and casual stay plain so the office does not
 * turn into a costume parade.
 */
const PATTERN_WEIGHTS_BY_CLOTHING: Record<ClothingStyle, [FabricPattern, number][]> = {
  uzbek_national: [['atlas', 5], ['adras', 4], ['ornament', 3], ['none', 0.5]],
  modern_uzbek: [['atlas', 3], ['adras', 3], ['ornament', 2], ['none', 3]],
  traditional: [['adras', 4], ['ornament', 4], ['atlas', 2], ['none', 1]],
  business: [['none', 10], ['ornament', 0.5], ['atlas', 0], ['adras', 0]],
  casual: [['none', 10], ['ornament', 0.5], ['atlas', 0], ['adras', 0]],
};

function clothingPalette(style: ClothingStyle, pattern: FabricPattern): readonly string[] {
  if (pattern === 'atlas') return ATLAS_COLORS;
  if (pattern === 'adras') return ADRAS_COLORS;

  switch (style) {
    case 'business':
      return BUSINESS_COLORS;
    case 'casual':
      return CASUAL_COLORS;
    case 'modern_uzbek':
      return MODERN_UZBEK_COLORS;
    case 'uzbek_national':
    case 'traditional':
      return ADRAS_COLORS;
  }
}

/**
 * Picks a garment colour that reads as clothing against the agent's own skin.
 * Starting from a seeded offset keeps the choice deterministic while still
 * letting us walk the palette when the first candidate is too close.
 */
function pickClothingColor(
  style: ClothingStyle,
  pattern: FabricPattern,
  skinTone: string,
  rng: ReturnType<typeof createRng>
): string {
  const palette = clothingPalette(style, pattern);
  const start = rng.int(0, palette.length - 1);

  for (let step = 0; step < palette.length; step++) {
    const candidate = palette[(start + step) % palette.length];
    if (hasEnoughContrast(candidate, skinTone)) return candidate;
  }

  // No palette entry separates enough (only possible for very dark skin against
  // the dark business palette): fall back to the most distant one.
  return palette.reduce((best, candidate) =>
    colorDistance(candidate, skinTone) > colorDistance(best, skinTone) ? candidate : best
  );
}

/**
 * Picks an accent that stays readable against `clothingColor`. Used for
 * embroidery threads and UI trim, so it must never collide with the base cloth.
 */
function pickAccentColor(clothingColor: string, rng: ReturnType<typeof createRng>): string {
  const candidates = [...ATLAS_COLORS, ...MODERN_UZBEK_COLORS, '#E4C97A', '#F5F2EA'].filter(
    (color) => color.toLowerCase() !== clothingColor.toLowerCase()
  );
  return rng.pick(candidates);
}

function pickHairStyle(gender: Gender, rng: ReturnType<typeof createRng>): HairStyle {
  return gender === 'male' ? rng.pick(MALE_HAIR_STYLES) : rng.pick(FEMALE_HAIR_STYLES);
}

/** Resolves the seed an agent's appearance derives from. */
export function resolveSeed(subject: AvatarSubject): string {
  return subject.avatarSeed?.trim() || subject.id;
}

export function generateAvatar(subject: AvatarSubject): AvatarConfig {
  const seed = resolveSeed(subject);
  const overrides = subject.avatar ?? {};
  const bias = ROLE_BIASES[inferRoleArchetype(subject.name ?? '', subject.description ?? '')];

  // Independent sub-streams: adding a field later must not shift existing ones.
  const rng = {
    gender: createRng(`${seed}:gender`),
    age: createRng(`${seed}:age`),
    face: createRng(`${seed}:face`),
    hair: createRng(`${seed}:hair`),
    beard: createRng(`${seed}:beard`),
    body: createRng(`${seed}:body`),
    clothing: createRng(`${seed}:clothing`),
    doppi: createRng(`${seed}:doppi`),
    personality: createRng(`${seed}:personality`),
  };

  const gender: Gender =
    overrides.gender ?? (rng.gender.chance(MALE_PROBABILITY) ? 'male' : 'female');

  const ageGroup: AgeGroup = overrides.ageGroup ?? rng.age.weighted(bias.age);

  const hairColor =
    overrides.hairColor ?? rng.hair.pick(rng.hair.weighted(HAIR_COLOR_WEIGHTS_BY_AGE[ageGroup]));

  // Facial hair is a male-only trait here; a pinned style is ignored for women
  // so the editor can never produce a bearded female avatar.
  const beardStyle: BeardStyle =
    gender === 'female'
      ? 'clean_shaven'
      : overrides.beardStyle ?? rng.beard.weighted(BEARD_WEIGHTS_BY_AGE[ageGroup]);

  const skinTone = overrides.skinTone ?? rng.face.pick(SKIN_TONES);

  const clothingStyle: ClothingStyle = overrides.clothingStyle ?? rng.clothing.weighted(bias.clothing);
  const fabricPattern: FabricPattern =
    overrides.fabricPattern ?? rng.clothing.weighted(PATTERN_WEIGHTS_BY_CLOTHING[clothingStyle]);
  const clothingColor =
    overrides.clothingColor ?? pickClothingColor(clothingStyle, fabricPattern, skinTone, rng.clothing);

  // Only men wear the doppi, so a pinned value cannot force one onto a woman.
  const wearsDoppi =
    gender === 'female' ? false : overrides.wearsDoppi ?? rng.doppi.chance(DOPPI_PROBABILITY);
  const doppiStyle: DoppiStyle | undefined = wearsDoppi
    ? overrides.doppiStyle ?? rng.doppi.pick(DOPPI_STYLES)
    : undefined;

  const range = HEIGHT_RANGE[gender];

  return {
    gender,
    ageGroup,
    skinTone,
    faceType: overrides.faceType ?? rng.face.pick(FACE_TYPES),
    eyeColor: overrides.eyeColor ?? rng.face.pick(EYE_COLORS),
    hairStyle: overrides.hairStyle ?? pickHairStyle(gender, rng.hair),
    hairColor,
    beardStyle,
    height: overrides.height ?? rng.body.int(range.min, range.max),
    bodyType: overrides.bodyType ?? rng.body.weighted(BODY_WEIGHTS_BY_AGE[ageGroup]),
    clothingStyle,
    clothingColor,
    fabricPattern,
    wearsDoppi,
    doppiStyle,
    personality: overrides.personality ?? rng.personality.weighted(bias.personality),
    primaryColor: overrides.primaryColor ?? subject.color ?? '#7C3AED',
    accentColor:
      overrides.accentColor ??
      (doppiStyle ? DOPPI_ORNAMENT_COLORS[doppiStyle] : pickAccentColor(clothingColor, rng.clothing)),
    seed,
  };
}

/**
 * Produces the seed/override pair for a fresh appearance.
 *
 * With `keepIdentity` the agent stays the same person — gender and personality
 * are pinned as overrides — while everything else is redrawn from a new seed.
 * Callers persist the result so the new look survives a reload.
 */
export function regenerateAvatar(
  subject: AvatarSubject,
  options: { keepIdentity?: boolean } = {}
): { avatarSeed: string; avatar: AvatarOverrides } {
  const current = generateAvatar(subject);

  // Counter-based so repeated clicks always move to a genuinely new seed.
  const previous = resolveSeed(subject);
  const revision = /#(\d+)$/.exec(previous);
  const avatarSeed = revision
    ? previous.replace(/#\d+$/, `#${Number(revision[1]) + 1}`)
    : `${subject.id}#1`;

  const avatar: AvatarOverrides = options.keepIdentity
    ? { gender: current.gender, personality: current.personality }
    : {};

  return { avatarSeed, avatar };
}

/**
 * Chooses a gender for a newly created agent so the roster keeps a 40–60%
 * balance, which independent per-seed draws cannot guarantee on a small team.
 * The caller persists the result, keeping the agent stable from then on.
 */
export function pickBalancedGender(existing: readonly AvatarConfig[], agentId: string): Gender {
  const males = existing.filter((config) => config.gender === 'male').length;
  const females = existing.length - males;

  if (males > females) return 'female';
  if (females > males) return 'male';

  // Tied (including an empty roster): fall back to the agent's own seed.
  return createRng(`${agentId}:gender`).chance(MALE_PROBABILITY) ? 'male' : 'female';
}
