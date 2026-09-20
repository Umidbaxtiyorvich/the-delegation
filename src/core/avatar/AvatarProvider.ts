/**
 * Rendering-agnostic avatar resolution.
 *
 * An `AvatarConfig` says *who* the agent is; a provider says *how* to draw
 * them. The office currently renders every agent as an instance of a single
 * shared mesh, so `ProceduralAvatarProvider` reduces a config to per-instance
 * parameters. A future GLB/VRM/Ready Player Me provider can implement the same
 * interface and return a `modelUrl` instead, without any caller changing.
 */

import { generateAvatar, AvatarSubject } from './generateAvatar';
import { AvatarConfig, FabricPattern } from './types';

/** Accessory slot on the shared character mesh. */
export type AvatarAccessory = 'none' | 'doppi' | 'headphones';

/** Reference height in centimetres that maps to a mesh scale of 1.0. */
export const REFERENCE_HEIGHT_CM = 175;

const BODY_WIDTH_FACTORS = {
  slim: 0.94,
  average: 1.0,
  athletic: 1.03,
  sturdy: 1.08,
  heavy: 1.14,
} as const;

/**
 * Everything the instanced renderer needs for one agent. Plain numbers and
 * colour strings only — no THREE types — so this stays testable outside WebGPU.
 */
export interface AvatarInstanceParams {
  skinColor: string;
  clothingColor: string;
  accentColor: string;
  hairColor: string;
  eyeColor: string;
  accessory: AvatarAccessory;
  fabricPattern: FabricPattern;
  /** Uniform vertical scale derived from `config.height`. */
  scale: number;
  /** Horizontal scale derived from `config.bodyType`. */
  widthScale: number;
}

export interface ResolvedAvatar {
  id: string;
  config: AvatarConfig;
  kind: 'procedural' | 'gltf';
  instance: AvatarInstanceParams;
  /** Only set by model-backed providers. */
  modelUrl?: string;
}

export interface AvatarProvider {
  readonly kind: ResolvedAvatar['kind'];
  /** Resolves a config into something renderable. */
  generateAvatar(config: AvatarConfig): Promise<ResolvedAvatar>;
  /** Resolves by agent id, deriving the config when it is not cached. */
  loadAvatar(subject: AvatarSubject): Promise<ResolvedAvatar>;
  /** Drops cached entries; pass an id to evict a single agent. */
  invalidate(id?: string): void;
}

export function toInstanceParams(config: AvatarConfig): AvatarInstanceParams {
  return {
    skinColor: config.skinTone,
    clothingColor: config.clothingColor,
    accentColor: config.accentColor,
    hairColor: config.hairColor,
    eyeColor: config.eyeColor,
    accessory: config.wearsDoppi ? 'doppi' : 'none',
    fabricPattern: config.fabricPattern,
    scale: config.height / REFERENCE_HEIGHT_CM,
    widthScale: BODY_WIDTH_FACTORS[config.bodyType],
  };
}

/**
 * Default provider: no external assets, resolves synchronously under the hood
 * and caches by seed so re-renders stay free.
 */
export class ProceduralAvatarProvider implements AvatarProvider {
  public readonly kind = 'procedural' as const;

  private cache = new Map<string, ResolvedAvatar>();

  public async generateAvatar(config: AvatarConfig): Promise<ResolvedAvatar> {
    const cached = this.cache.get(config.seed);
    if (cached) return cached;

    const resolved: ResolvedAvatar = {
      id: config.seed,
      config,
      kind: this.kind,
      instance: toInstanceParams(config),
    };

    this.cache.set(config.seed, resolved);
    return resolved;
  }

  public async loadAvatar(subject: AvatarSubject): Promise<ResolvedAvatar> {
    return this.generateAvatar(generateAvatar(subject));
  }

  public invalidate(id?: string): void {
    if (id === undefined) {
      this.cache.clear();
      return;
    }
    // Regeneration appends a "#n" revision, so evict every seed for this agent.
    for (const seed of this.cache.keys()) {
      if (seed === id || seed.startsWith(`${id}#`)) this.cache.delete(seed);
    }
  }
}

let activeProvider: AvatarProvider = new ProceduralAvatarProvider();

export function getAvatarProvider(): AvatarProvider {
  return activeProvider;
}

/** Swaps the provider, e.g. once real GLB character models are available. */
export function setAvatarProvider(provider: AvatarProvider): void {
  activeProvider = provider;
}
