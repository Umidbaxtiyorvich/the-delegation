import { DEFAULT_MODELS } from './constants';

export interface ModelPricing {
  inputPer1M?: number;
  outputPer1M?: number;
  perImage?: number;
  perSong?: number;
  perSecond?: number;
}

export const OPENAI_PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
  'gpt-4.1-mini': { inputPer1M: 0.40, outputPer1M: 1.60 },
  'gpt-4.1': { inputPer1M: 2.00, outputPer1M: 8.00 },
  'dall-e-3': { perImage: 0.040 },
  'gpt-image-1': { perImage: 0.040 },
  'text-embedding-3-small': { inputPer1M: 0.02 },
};

/** @deprecated alias kept for older imports */
export const GEMINI_PRICING = OPENAI_PRICING;

export const DEFAULT_PRICING: ModelPricing = OPENAI_PRICING[DEFAULT_MODELS.text];

export function calculateCost(promptTokens: number, completionTokens: number, modelName: string, durationOrCount?: number): number {
  const lowerName = modelName.toLowerCase();
  const pricingKey = Object.keys(OPENAI_PRICING).find(key => lowerName.includes(key));
  const pricing = pricingKey ? OPENAI_PRICING[pricingKey] : DEFAULT_PRICING;

  if (pricing.perImage !== undefined) {
    return (durationOrCount || 1) * pricing.perImage;
  }
  if (pricing.perSong !== undefined) {
    return (durationOrCount || 1) * pricing.perSong;
  }
  if (pricing.perSecond !== undefined) {
    return (durationOrCount || 4) * pricing.perSecond;
  }

  const inputCost = (promptTokens / 1000000) * (pricing.inputPer1M || 0);
  const outputCost = (completionTokens / 1000000) * (pricing.outputPer1M || 0);
  return inputCost + outputCost;
}

export function calculateTokensForCost(modelName: string, durationOrCount?: number): number {
  const lowerName = modelName.toLowerCase();
  const pricingKey = Object.keys(OPENAI_PRICING).find(key => lowerName.includes(key));
  const pricing = pricingKey ? OPENAI_PRICING[pricingKey] : DEFAULT_PRICING;

  const cost = calculateCost(0, 0, modelName, durationOrCount);
  const baseOutputPrice = OPENAI_PRICING[DEFAULT_MODELS.text]?.outputPer1M || 0.60;

  return Math.floor((cost / baseOutputPrice) * 1000000);
}
