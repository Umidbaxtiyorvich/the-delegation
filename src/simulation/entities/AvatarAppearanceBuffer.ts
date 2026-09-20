import { storage } from 'three/tsl';
import * as THREE from 'three/webgpu';
import { getDoppiColor, getFabricCode, getHairCoverage } from '../../core/avatar/appearance';
import { AvatarConfig } from '../../core/avatar/types';
import { REFERENCE_HEIGHT_CM } from '../../core/avatar/AvatarProvider';

/** Horizontal widening per build; height already scales the whole figure. */
const BODY_WIDTH_FACTORS: Record<AvatarConfig['bodyType'], number> = {
  slim: 0.94,
  average: 1.0,
  athletic: 1.03,
  sturdy: 1.08,
  heavy: 1.14,
};

/** vec4 slots occupied by each instance. Shaders index with this stride. */
export const APPEARANCE_STRIDE = 5;
const STRIDE = APPEARANCE_STRIDE;

/**
 * Per-instance appearance for the shared character mesh.
 *
 * This is a storage buffer rather than a set of instanced vertex attributes on
 * purpose: WebGPU caps a pipeline at 8 vertex buffers, and the character
 * material already uses 7 (position, normal, uv, skinIndex, skinWeight,
 * instanceColor, accessoryType). Six more would blow the limit and invalidate
 * the render pipeline, so the data rides in a storage buffer indexed by
 * `instanceIndex` instead — the same approach as AgentStateBuffer.
 *
 * Layout, 5 vec4 per instance:
 *   0: skin.rgb    | fabric pattern code
 *   1: cloth.rgb   | height scale
 *   2: accent.rgb  | width scale
 *   3: doppi.rgb   | reserved
 *   4: hair.rgb    | hair coverage (0 = buzz cut, 1 = long)
 */
export class AvatarAppearanceBuffer {
  public readonly array: Float32Array;
  public readonly attribute: THREE.StorageInstancedBufferAttribute;
  public readonly storageNode: any;

  private readonly color = new THREE.Color();

  constructor(private readonly count: number) {
    this.array = new Float32Array(count * STRIDE * 4);
    this.attribute = new THREE.StorageInstancedBufferAttribute(this.array, 4);
    this.storageNode = storage(this.attribute, 'vec4', count * STRIDE);
  }

  /** Writes an sRGB hex colour into the rgb part of one vec4 slot. */
  private writeColor(base: number, slot: number, hex: string): void {
    this.color.set(hex);
    const at = (base + slot) * 4;
    this.array[at + 0] = this.color.r;
    this.array[at + 1] = this.color.g;
    this.array[at + 2] = this.color.b;
  }

  public set(index: number, config: AvatarConfig): void {
    if (index < 0 || index >= this.count) return;

    const base = index * STRIDE;
    const height = config.height / REFERENCE_HEIGHT_CM;

    this.writeColor(base, 0, config.skinTone);
    this.array[(base + 0) * 4 + 3] = getFabricCode(config);

    this.writeColor(base, 1, config.clothingColor);
    this.array[(base + 1) * 4 + 3] = height;

    this.writeColor(base, 2, config.accentColor);
    this.array[(base + 2) * 4 + 3] = height * BODY_WIDTH_FACTORS[config.bodyType];

    this.writeColor(base, 3, getDoppiColor(config));

    this.writeColor(base, 4, config.hairColor);
    this.array[(base + 4) * 4 + 3] = getHairCoverage(config);

    this.attribute.needsUpdate = true;
  }
}
