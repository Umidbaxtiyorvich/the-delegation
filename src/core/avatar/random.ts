/**
 * Seeded pseudo-randomness for avatar generation.
 *
 * `Math.random` is unusable here: an agent must look identical every time the
 * project is reopened. These helpers turn a seed string into a repeatable
 * stream, so the same `agent.id` always produces the same person.
 */

/** xmur3 string hash — spreads short, similar ids (e.g. "agent-1"/"agent-2") apart. */
export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** True with the given probability (0..1). */
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Picks by relative weight; entries with weight <= 0 are never chosen. */
  weighted<T>(entries: readonly [T, number][]): T;
}

/**
 * Creates an independent stream from `seed`. Callers derive sub-streams by
 * suffixing the seed (e.g. `createRng(id + ':hair')`) so that adding a new
 * generated field never shifts the values of existing ones.
 */
export function createRng(seed: string): Rng {
  // mulberry32 — small, fast, and good enough distribution for cosmetic choices.
  let state = hashSeed(seed);

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (probability) => next() < probability,
    pick: (items) => {
      if (items.length === 0) throw new Error('createRng().pick: empty list');
      return items[Math.floor(next() * items.length)];
    },
    weighted: (entries) => {
      const usable = entries.filter(([, weight]) => weight > 0);
      if (usable.length === 0) throw new Error('createRng().weighted: no positive weights');
      const total = usable.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = next() * total;
      for (const [value, weight] of usable) {
        roll -= weight;
        if (roll < 0) return value;
      }
      return usable[usable.length - 1][0];
    },
  };

  return rng;
}
