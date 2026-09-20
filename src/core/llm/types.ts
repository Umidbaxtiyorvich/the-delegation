export type LLMProviderId = 'openai' | 'gemini' | 'claude';

export type LLMRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LLMMessage {
  role: LLMRole;
  content: string;
  name?: string;
  tool_calls?: LLMToolCall[];
  images?: string[];
  metadata?: {
    internal?: boolean;
    attachments?: any[];
    returnedFile?: { filename: string; mime: string; dataUrl: string };
    [key: string]: any;
  };
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface LLMProviderKeys {
  openai?: string;
  gemini?: string;
  claude?: string;
}

export interface LLMConfig {
  /** @deprecated prefer keys.openai — kept for backward compatibility */
  apiKey?: string;
  baseUrl?: string;
  model: string;
  provider?: LLMProviderId;
  embedModel?: string;
  keys?: LLMProviderKeys;
}

export interface LLMRequestDetails {
  contents: any[];
  systemInstruction?: string;
  tools?: any[];
}

export interface LLMTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string | null;
  tool_calls?: LLMToolCall[];
  usage?: LLMTokenUsage;
  finishReason?: string;
  raw?: any;
  request?: LLMRequestDetails;
}

export interface LLMProvider {
  generateCompletion(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    systemInstruction?: string,
    modelName?: string
  ): Promise<LLMResponse>;
}
