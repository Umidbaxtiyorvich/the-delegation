/**
 * Maps an agent's role to soft appearance biases.
 *
 * These are *weights*, never hard rules: a CEO leans older and more formal, but
 * the seed still decides, so two teams never produce the same-looking lead.
 * Keywords cover Uzbek and English because roles are authored in both (and the
 * lead invents new ones at runtime via the hire_agent tool).
 */

import { AgeGroup, ClothingStyle, Personality } from './types';

export type RoleArchetype =
  | 'executive'
  | 'product'
  | 'engineering'
  | 'marketing'
  | 'finance'
  | 'creative'
  | 'research'
  | 'security'
  | 'assistant'
  | 'generic';

/** Ordered by specificity: the first archetype whose keyword matches wins. */
const ROLE_KEYWORDS: [RoleArchetype, string[]][] = [
  ['finance', ['moliya', 'buxgalter', 'hisobchi', 'iqtisod', 'finance', 'accountant', 'cfo', 'budget']],
  ['security', ['xavfsizlik', 'security', 'huquq', 'yurist', 'legal', 'compliance', 'audit']],
  ['engineering', [
    'texnika', 'dasturchi', 'injener', 'muhandis', 'backend', 'frontend', 'devops',
    'tech', 'engineer', 'developer', 'cto', 'qa', 'test',
  ]],
  ['marketing', [
    'marketing', 'growth', 'osish', 'o‘sish', 'oʻsish', 'kontent', 'content',
    'brend', 'brand', 'reklama', 'sotuv', 'sales', 'smm',
  ]],
  ['research', [
    'tadqiqot', 'tahlil', 'analitik', 'research', 'analyst', 'analytics', 'data', 'ilmiy',
  ]],
  ['creative', ['dizayn', 'design', 'ijod', 'creative', 'ux', 'ui', 'illustrator', 'video']],
  ['product', ['mahsulot', 'product', 'loyiha', 'project', 'strateg', 'strategy', 'owner']],
  ['assistant', ['assistent', 'yordamchi', 'support', 'qollab', 'qoʻllab', 'operator', 'hr', 'kadr']],
  ['executive', ['direktor', 'ceo', 'bosh ', 'rahbar', 'boshliq', 'founder', 'lead', 'head']],
];

export function inferRoleArchetype(name: string, description: string): RoleArchetype {
  const haystack = `${name} ${description}`.toLowerCase();
  for (const [archetype, keywords] of ROLE_KEYWORDS) {
    if (keywords.some((keyword) => haystack.includes(keyword))) return archetype;
  }
  return 'generic';
}

export interface RoleBias {
  age: [AgeGroup, number][];
  clothing: [ClothingStyle, number][];
  personality: [Personality, number][];
}

/**
 * Every archetype keeps a non-zero weight on most options so role never fully
 * determines appearance (requirement: "rol avatarni 100% belgilamasin").
 */
export const ROLE_BIASES: Record<RoleArchetype, RoleBias> = {
  executive: {
    age: [['young', 1], ['adult', 4], ['middle_aged', 5], ['senior', 3]],
    clothing: [['business', 5], ['modern_uzbek', 4], ['uzbek_national', 2], ['traditional', 1], ['casual', 1]],
    personality: [['calm', 4], ['bold', 4], ['thoughtful', 3], ['analytical', 2], ['warm', 2], ['meticulous', 1], ['energetic', 1]],
  },
  product: {
    age: [['young', 3], ['adult', 5], ['middle_aged', 3], ['senior', 1]],
    clothing: [['modern_uzbek', 4], ['business', 3], ['casual', 3], ['uzbek_national', 2], ['traditional', 1]],
    personality: [['thoughtful', 4], ['analytical', 3], ['calm', 3], ['energetic', 2], ['bold', 2], ['warm', 2], ['meticulous', 2]],
  },
  engineering: {
    age: [['young', 5], ['adult', 5], ['middle_aged', 2], ['senior', 1]],
    clothing: [['casual', 5], ['modern_uzbek', 4], ['business', 2], ['uzbek_national', 1], ['traditional', 1]],
    personality: [['analytical', 5], ['meticulous', 4], ['calm', 3], ['thoughtful', 3], ['energetic', 1], ['bold', 1], ['warm', 1]],
  },
  marketing: {
    age: [['young', 5], ['adult', 4], ['middle_aged', 2], ['senior', 1]],
    clothing: [['modern_uzbek', 5], ['casual', 4], ['uzbek_national', 3], ['business', 2], ['traditional', 1]],
    personality: [['energetic', 5], ['bold', 4], ['warm', 3], ['thoughtful', 2], ['calm', 1], ['analytical', 1], ['meticulous', 1]],
  },
  finance: {
    age: [['young', 1], ['adult', 4], ['middle_aged', 5], ['senior', 2]],
    clothing: [['business', 5], ['modern_uzbek', 3], ['traditional', 2], ['uzbek_national', 2], ['casual', 1]],
    personality: [['meticulous', 5], ['analytical', 4], ['calm', 3], ['thoughtful', 2], ['bold', 1], ['warm', 1], ['energetic', 1]],
  },
  creative: {
    age: [['young', 5], ['adult', 4], ['middle_aged', 2], ['senior', 1]],
    clothing: [['modern_uzbek', 5], ['uzbek_national', 4], ['casual', 4], ['traditional', 2], ['business', 1]],
    personality: [['energetic', 4], ['bold', 4], ['warm', 3], ['thoughtful', 3], ['analytical', 1], ['calm', 1], ['meticulous', 1]],
  },
  research: {
    age: [['young', 2], ['adult', 4], ['middle_aged', 4], ['senior', 3]],
    clothing: [['business', 4], ['modern_uzbek', 3], ['traditional', 3], ['casual', 2], ['uzbek_national', 2]],
    personality: [['analytical', 5], ['thoughtful', 4], ['meticulous', 3], ['calm', 3], ['warm', 1], ['bold', 1], ['energetic', 1]],
  },
  security: {
    age: [['young', 2], ['adult', 5], ['middle_aged', 4], ['senior', 2]],
    clothing: [['business', 5], ['traditional', 2], ['modern_uzbek', 2], ['casual', 2], ['uzbek_national', 1]],
    personality: [['meticulous', 5], ['calm', 4], ['analytical', 3], ['bold', 3], ['thoughtful', 2], ['warm', 1], ['energetic', 1]],
  },
  assistant: {
    age: [['young', 4], ['adult', 5], ['middle_aged', 2], ['senior', 1]],
    clothing: [['modern_uzbek', 4], ['business', 3], ['uzbek_national', 3], ['casual', 3], ['traditional', 1]],
    personality: [['warm', 5], ['energetic', 3], ['calm', 3], ['meticulous', 2], ['thoughtful', 2], ['analytical', 1], ['bold', 1]],
  },
  generic: {
    age: [['young', 3], ['adult', 4], ['middle_aged', 3], ['senior', 2]],
    clothing: [['modern_uzbek', 3], ['business', 3], ['uzbek_national', 3], ['casual', 3], ['traditional', 2]],
    personality: [['calm', 2], ['energetic', 2], ['analytical', 2], ['warm', 2], ['meticulous', 2], ['bold', 2], ['thoughtful', 2]],
  },
};
