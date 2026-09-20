/**
 * Anthropic Claude Messages API (fetch — no heavy SDK).
 */

import {
  LLMMessage,
  LLMProvider,
  LLMResponse,
  LLMToolCall,
  LLMToolDefinition,
} from '../types';
import { DEFAULT_ANTHROPIC_BASE_URL, DEFAULT_MODELS } from '../constants';

export class ClaudeProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private baseUrl: string = DEFAULT_ANTHROPIC_BASE_URL,
  ) {}

  async generateCompletion(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    systemInstruction?: string,
    modelName: string = DEFAULT_MODELS.claude,
  ): Promise<LLMResponse> {
    const mapped = this.mapMessages(messages);
    const body: Record<string, unknown> = {
      model: modelName,
      max_tokens: 4096,
      messages: mapped,
    };
    if (systemInstruction) body.system = systemInstruction;
    if (tools?.length) {
      body.tools = tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters || { type: 'object', properties: {} },
      }));
    }

    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API ${res.status}: ${errText.slice(0, 400)}`);
    }

    const data = await res.json();
    let contentStr: string | null = null;
    const toolCalls: LLMToolCall[] = [];

    for (const block of data.content || []) {
      if (block.type === 'text') {
        contentStr = (contentStr || '') + (block.text || '');
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id || Math.random().toString(36).slice(2),
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input ?? {}),
          },
        });
      }
    }

    const usage = data.usage
      ? {
          promptTokens: data.usage.input_tokens || 0,
          completionTokens: data.usage.output_tokens || 0,
          totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
        }
      : undefined;

    return {
      content: contentStr,
      tool_calls: toolCalls.length ? toolCalls : undefined,
      usage,
      finishReason: data.stop_reason,
      raw: data,
      request: {
        contents: mapped,
        systemInstruction,
        tools,
      },
    };
  }

  private mapMessages(messages: LLMMessage[]): any[] {
    const out: any[] = [];
    for (const msg of messages) {
      if (msg.role === 'system') continue;
      if (msg.role === 'tool') {
        out.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.name || 'tool',
              content: msg.content || '',
            },
          ],
        });
        continue;
      }
      if (msg.role === 'assistant' && msg.tool_calls?.length) {
        const content: any[] = [];
        if (msg.content) content.push({ type: 'text', text: msg.content });
        for (const tc of msg.tool_calls) {
          let input = {};
          try {
            input = JSON.parse(tc.function.arguments || '{}');
          } catch {
            input = {};
          }
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input,
          });
        }
        out.push({ role: 'assistant', content });
        continue;
      }
      out.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content || '',
      });
    }
    return out;
  }
}
