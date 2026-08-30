export const DEFAULT_MODELS = {
  text: 'gpt-4o-mini',
  image: 'dall-e-3',
  music: 'gpt-4o-mini',
  video: 'gpt-4o-mini',
  embed: 'text-embedding-3-small',
} as const;

export const AVAILABLE_MODELS = {
  text: [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4.1-mini',
    'gpt-4.1',
  ],
  image: [
    'dall-e-3',
    'gpt-image-1',
  ],
  music: [
    'gpt-4o-mini',
  ],
  video: [
    'gpt-4o-mini',
  ],
} as const;

export type ModelType = keyof typeof AVAILABLE_MODELS;

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
