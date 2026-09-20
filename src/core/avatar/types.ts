/**
 * Avatar data model for the Ikki Miya agents.
 *
 * The visual layer is deliberately decoupled from agent identity: an `AvatarConfig`
 * is derived from the agent's stable `id` (see `generateAvatar`), so reopening the
 * project always reproduces the same person. Nothing here touches AI logic,
 * memory, tools or tasks.
 */

export type Gender = 'male' | 'female';

export type AgeGroup = 'young' | 'adult' | 'middle_aged' | 'senior';

export type ClothingStyle =
  | 'uzbek_national'
  | 'modern_uzbek'
  | 'business'
  | 'casual'
  | 'traditional';

export type FaceType = 'oval' | 'round' | 'square' | 'long' | 'angular' | 'heart';

export type BodyType = 'slim' | 'average' | 'athletic' | 'sturdy' | 'heavy';

export type BeardStyle =
  | 'clean_shaven'
  | 'light_stubble'
  | 'short_beard'
  | 'medium_beard'
  | 'mustache';

export type MaleHairStyle =
  | 'short_black'
  | 'side_part'
  | 'buzz_cut'
  | 'modern_quiff'
  | 'classic_uzbek'
  | 'receding';

export type FemaleHairStyle =
  | 'long_straight'
  | 'shoulder_length'
  | 'tied_bun'
  | 'braided'
  | 'long_wavy';

export type HairStyle = MaleHairStyle | FemaleHairStyle;

/**
 * Doppi (o'zbek milliy bosh kiyimi) variants. Only worn by male avatars, and
 * only when `wearsDoppi` is true — the renderer must hide the mesh otherwise.
 */
export type DoppiStyle =
  | 'black_chust'
  | 'white'
  | 'patterned_green'
  | 'patterned_gold'
  | 'modern_black';

/**
 * Textile pattern used for national clothing. Drives the procedural fabric
 * texture generator, which is why plain styles resolve to 'none'.
 */
export type FabricPattern = 'none' | 'atlas' | 'adras' | 'ornament';

export type Personality =
  | 'calm'
  | 'energetic'
  | 'analytical'
  | 'warm'
  | 'meticulous'
  | 'bold'
  | 'thoughtful';

export interface AvatarConfig {
  gender: Gender;
  ageGroup: AgeGroup;

  skinTone: string;
  faceType: FaceType;
  eyeColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  beardStyle: BeardStyle;

  /** Body height in centimetres; the 3D layer converts this to a mesh scale. */
  height: number;
  bodyType: BodyType;

  clothingStyle: ClothingStyle;
  clothingColor: string;
  fabricPattern: FabricPattern;

  wearsDoppi: boolean;
  doppiStyle?: DoppiStyle;

  personality: Personality;

  /** Agent brand colour, kept so the avatar stays recognisable in the graph. */
  primaryColor: string;
  accentColor: string;

  /** The exact string the config was derived from. Required for reproducibility. */
  seed: string;
}

/**
 * Fields a user may pin by hand in the avatar editor. Anything left undefined
 * is filled in by the generator from the seed, so a partial override still
 * yields a complete, deterministic avatar.
 */
export type AvatarOverrides = Partial<Omit<AvatarConfig, 'seed'>>;

/** The subset the "Keep Identity" regeneration option preserves. */
export const IDENTITY_FIELDS = ['gender', 'personality'] as const;

/**
 * Animation states the avatar can display. These map onto the agent's runtime
 * behaviour rather than onto raw GLB clip names, so the 3D and 2D layers can
 * each resolve them independently.
 */
export type AvatarAnimationState =
  | 'idle'
  | 'thinking'
  | 'listening'
  | 'speaking'
  | 'happy'
  | 'sad'
  | 'confused'
  | 'working'
  | 'success'
  | 'error'
  | 'sleeping';
