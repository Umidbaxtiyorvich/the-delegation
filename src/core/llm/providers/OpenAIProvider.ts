import { LLMMessage, LLMProvider, LLMResponse, LLMToolCall, LLMToolDefinition } from '../types';
import { DEFAULT_MODELS } from '../constants';

type OpenAIChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

export class OpenAIProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private baseUrl: string = 'https://api.openai.com/v1'
  ) {}

  private endpoint(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}${path}`;
  }

  async generateCompletion(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    systemInstruction?: string,
    modelName: string = DEFAULT_MODELS.text
  ): Promise<LLMResponse> {
    const chatMessages: OpenAIChatMessage[] = [];

    if (systemInstruction) {
      chatMessages.push({ role: 'system', content: systemInstruction });
    }

    for (const msg of messages) {
      chatMessages.push(this.mapMessage(msg));
    }

    const body: Record<string, unknown> = {
      model: modelName,
      messages: chatMessages,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }));
      body.tool_choice = 'auto';
    }

    const res = await fetch(this.endpoint('/chat/completions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg =
        raw?.error?.message ||
        raw?.message ||
        `OpenAI xatosi (${res.status})`;
      throw new Error(errMsg);
    }

    const choice = raw.choices?.[0];
    const message = choice?.message || {};
    const content: string | null = message.content ?? null;

    const toolCalls: LLMToolCall[] = Array.isArray(message.tool_calls)
      ? message.tool_calls.map((tc: any) => ({
          id: tc.id || Math.random().toString(36).slice(2),
          type: 'function' as const,
          function: {
            name: tc.function?.name,
            arguments:
              typeof tc.function?.arguments === 'string'
                ? tc.function.arguments
                : JSON.stringify(tc.function?.arguments || {}),
          },
        }))
      : [];

    const usage = raw.usage
      ? {
          promptTokens: raw.usage.prompt_tokens || 0,
          completionTokens: raw.usage.completion_tokens || 0,
          totalTokens: raw.usage.total_tokens || 0,
        }
      : undefined;

    return {
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
      finishReason: choice?.finish_reason,
      raw,
      request: {
        contents: chatMessages,
        systemInstruction,
        tools,
      },
    };
  }

  async generateImage(
    prompt: string,
    modelName: string = DEFAULT_MODELS.image,
    onProgress?: (msg: string) => void,
    _options: { aspectRatio?: string; imageSize?: string } = {},
    _images?: string[]
  ): Promise<{ data: string; usage?: any }> {
    if (onProgress) onProgress('Rasm yaratilmoqda (DALL·E)...');

    const size =
      _options.aspectRatio === '1:1'
        ? '1024x1024'
        : _options.aspectRatio === '9:16'
          ? '1024x1792'
          : '1792x1024';

    const res = await fetch(this.endpoint('/images/generations'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName.includes('gpt') || modelName.includes('dall')
          ? modelName
          : 'dall-e-3',
        prompt,
        n: 1,
        size,
        response_format: 'b64_json',
      }),
    });

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(raw?.error?.message || `Rasm yaratish xatosi (${res.status})`);
    }

    const b64 = raw.data?.[0]?.b64_json;
    if (!b64) throw new Error('Rasm maʼlumoti qaytmadi');

    return {
      data: `data:image/png;base64,${b64}`,
      usage: { model: modelName, perImage: 1 },
    };
  }

  async generateAudio(): Promise<{ data: string; usage?: any }> {
    throw new Error(
      'Musiqa generatsiyasi OpenAI orqali qoʻllab-quvvatlanmaydi. Text yoki Image jamoasidan foydalaning.'
    );
  }

  async generateVideo(): Promise<{ videoUrl: string; usage?: any }> {
    throw new Error(
      'Video generatsiyasi OpenAI orqali qoʻllab-quvvatlanmaydi. Text yoki Image jamoasidan foydalaning.'
    );
  }

  private mapMessage(msg: LLMMessage): OpenAIChatMessage {
    if (msg.images && msg.images.length > 0 && msg.role === 'user') {
      const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
      if (msg.content) {
        parts.push({ type: 'text', text: msg.content });
      }
      for (const img of msg.images) {
        const url = img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
        parts.push({ type: 'image_url', image_url: { url } });
      }
      return { role: 'user', content: parts };
    }

    if (msg.role === 'assistant' && msg.tool_calls?.length) {
      return {
        role: 'assistant',
        content: msg.content || undefined,
        tool_calls: msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      };
    }

    if (msg.role === 'tool') {
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.name,
        name: msg.name,
      };
    }

    return {
      role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    };
  }
}
