import type { LLMProviderId, LLMProviderKeys } from './types';

export const DEFAULT_MODELS = {
  text: 'gpt-4o-mini',
  image: 'dall-e-3',
  music: 'lyria-3-clip-preview',
  video: 'veo-3.1-generate-preview',
  embed: 'text-embedding-3-small',
  gemini: 'gemini-2.0-flash',
  claude: 'claude-3-5-haiku-latest',
} as const;

const OPENAI_TEXT_MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
] as const;

const OPENAI_IMAGE_MODELS = [
  'dall-e-3',
  'gpt-image-1',
] as const;

const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
] as const;

const GEMINI_VIDEO_MODELS = [
  'veo-3.1-generate-preview',
  'veo-3.1-fast-generate-preview',
] as const;

const GEMINI_MUSIC_MODELS = [
  'lyria-3-clip-preview',
  'lyria-3-pro-preview',
] as const;

export const AVAILABLE_MODELS = {
  text: [...OPENAI_TEXT_MODELS],
  image: [...OPENAI_IMAGE_MODELS, ...GEMINI_IMAGE_MODELS],
  music: [...GEMINI_MUSIC_MODELS],
  video: [...GEMINI_VIDEO_MODELS],
} as const;

export const PROVIDER_MODELS: Record<LLMProviderId, string[]> = {
  openai: [...OPENAI_TEXT_MODELS],
  gemini: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'],
  claude: ['claude-3-5-haiku-latest', 'claude-sonnet-4-20250514', 'claude-3-5-sonnet-latest'],
};

export type ModelType = keyof typeof AVAILABLE_MODELS;

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com';

export function inferProviderFromModel(model: string): LLMProviderId {
  const m = (model || '').toLowerCase();
  if (
    m.includes('gemini') ||
    m.includes('veo') ||
    m.includes('imagen') ||
    m.includes('lyria')
  ) {
    return 'gemini';
  }
  if (m.includes('claude')) return 'claude';
  return 'openai';
}

export function defaultModelForProvider(provider: LLMProviderId): string {
  if (provider === 'gemini') return DEFAULT_MODELS.gemini;
  if (provider === 'claude') return DEFAULT_MODELS.claude;
  return DEFAULT_MODELS.text;
}

export function isLiteVideoModel(model?: string): boolean {
  const m = (model || '').toLowerCase();
  return m.includes('lite') || m.includes('fast');
}

/** Final-asset models for a team output type, filtered by the keys the user actually saved. */
export function generationModelsFor(
  outputType: ModelType,
  keys?: LLMProviderKeys | null,
): string[] {
  const hasOpenai = !!(keys?.openai || '').trim();
  const hasGemini = !!(keys?.gemini || '').trim();
  const hasClaude = !!(keys?.claude || '').trim();
  const anyKey = hasOpenai || hasGemini || hasClaude;

  const take = (ok: boolean, models: readonly string[]) =>
    !anyKey || ok ? [...models] : [];

  if (outputType === 'video') {
    return [...GEMINI_VIDEO_MODELS];
  }
  if (outputType === 'image') {
    const list = [
      ...take(hasOpenai, OPENAI_IMAGE_MODELS),
      ...take(hasGemini, GEMINI_IMAGE_MODELS),
    ];
    return list.length ? list : [...AVAILABLE_MODELS.image];
  }
  if (outputType === 'music') {
    return [...GEMINI_MUSIC_MODELS];
  }
  const text = [
    ...take(hasOpenai, PROVIDER_MODELS.openai),
    ...take(hasGemini, PROVIDER_MODELS.gemini),
    ...take(hasClaude, PROVIDER_MODELS.claude),
  ];
  return text.length ? text : [...AVAILABLE_MODELS.text];
}
