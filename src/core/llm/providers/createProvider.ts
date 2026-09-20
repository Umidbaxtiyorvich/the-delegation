import {
  DEFAULT_ANTHROPIC_BASE_URL,
  DEFAULT_MODELS,
  DEFAULT_OPENAI_BASE_URL,
  defaultModelForProvider,
  inferProviderFromModel,
} from '../constants';
import type { LLMConfig, LLMProvider, LLMProviderId } from '../types';
import { ClaudeProvider } from './ClaudeProvider';
import { GeminiProvider } from './GeminiProvider';
import { OpenAIProvider } from './OpenAIProvider';

export function resolveProviderId(
  config: LLMConfig,
  agent?: Pick<AgentNode, 'model' | 'provider'> | null,
): LLMProviderId {
  if (agent?.provider) return agent.provider;
  if (agent?.model) return inferProviderFromModel(agent.model);
  if (config.provider) return config.provider;
  return inferProviderFromModel(config.model);
}

export function resolveApiKey(config: LLMConfig, provider: LLMProviderId): string {
  const keys = config.keys || {};
  if (provider === 'openai') return (keys.openai || config.apiKey || '').trim();
  if (provider === 'gemini') return (keys.gemini || '').trim();
  if (provider === 'claude') return (keys.claude || '').trim();
  return '';
}

export function resolveModel(
  config: LLMConfig,
  agent?: Pick<AgentNode, 'model' | 'provider'> | null,
): string {
  if (agent?.model) return agent.model;
  const provider = resolveProviderId(config, agent);
  if (config.model && inferProviderFromModel(config.model) === provider) return config.model;
  return defaultModelForProvider(provider);
}

export function createProviderFor(
  config: LLMConfig,
  agent?: Pick<AgentNode, 'model' | 'provider'> | null,
): { provider: LLMProvider; model: string; providerId: LLMProviderId } {
  const providerId = resolveProviderId(config, agent);
  const apiKey = resolveApiKey(config, providerId);
  const model = resolveModel(config, agent);

  if (!apiKey) {
    throw new Error(
      providerId === 'openai'
        ? 'OpenAI API kaliti kerak'
        : providerId === 'gemini'
          ? 'Gemini API kaliti kerak'
          : 'Claude API kaliti kerak',
    );
  }

  if (providerId === 'gemini') {
    return { provider: new GeminiProvider(apiKey), model, providerId };
  }
  if (providerId === 'claude') {
    return {
      provider: new ClaudeProvider(apiKey, DEFAULT_ANTHROPIC_BASE_URL),
      model,
      providerId,
    };
  }
  return {
    provider: new OpenAIProvider(apiKey, config.baseUrl || DEFAULT_OPENAI_BASE_URL),
    model,
    providerId,
  };
}

/** Strip Instagram/social tokens that users accidentally paste into LLM key fields. */
function sanitizeKey(key: string): string {
  const trimmed = (key || '').trim();
  if (/^IG[A-Za-z0-9]/i.test(trimmed)) return '';
  return trimmed;
}

/** Normalize legacy BYOK shape into keys + provider. */
export function normalizeLlmConfig(raw: Partial<LLMConfig> | null | undefined): LLMConfig {
  const keys = {
    openai: sanitizeKey(raw?.keys?.openai || raw?.apiKey || ''),
    gemini: sanitizeKey(raw?.keys?.gemini || ''),
    claude: sanitizeKey(raw?.keys?.claude || ''),
  };
  const provider = (raw?.provider || inferProviderFromModel(raw?.model || DEFAULT_MODELS.text)) as LLMProviderId;
  const model = raw?.model || defaultModelForProvider(provider);
  return {
    apiKey: keys.openai,
    baseUrl: raw?.baseUrl || DEFAULT_OPENAI_BASE_URL,
    model,
    embedModel: raw?.embedModel || DEFAULT_MODELS.embed,
    provider,
    keys,
  };
}

// Local type to avoid circular import issues with agents.ts
type AgentNode = { model?: string; provider?: LLMProviderId };
