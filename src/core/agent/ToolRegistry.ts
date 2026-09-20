import { LLMMessage } from '../llm/types';
import { setUserBrief } from './tools/setUserBrief';
import { proposeTask } from './tools/proposeTask';
import { completeTask } from './tools/completeTask';
import { deliverProject } from './tools/deliverProject';
import { shareInsight } from './tools/shareInsight';
import { requestPeerReview } from './tools/requestPeerReview';
import { hireAgent } from './tools/hireAgent';
import { setAgentModel } from './tools/setAgentModel';
import { returnFile } from './tools/returnFile';
import {
  instagramInsightsTool,
  instagramPublishPhotoTool,
  instagramPublishReelTool,
} from './tools/instagramTools';
import {
  telegramGetChatTool,
  telegramSendMessageTool,
  telegramSendPhotoTool,
} from './tools/telegramTools';

export interface ToolCall {
  name: string;
  args: any;
}

/**
 * Interface that decuples the ToolRegistry from the 3D Simulation (AgentHost).
 * This allows the tool logic to be tested and used independently of the simulation.
 */
export interface AgentActionContext {
  data: { index: number; name: string, subagents?: any[], humanInTheLoop?: boolean };
  setState: (state: 'idle' | 'moving' | 'working' | 'on_hold' | 'talking') => void;
  appendHistory: (message: LLMMessage) => void;
}

export type ToolResult = { ok: boolean; result: string };

export class ToolRegistry {
  /**
   * Processes a tool call by dispatching it to the appropriate tool handler.
   */
  public static async process(agent: AgentActionContext, toolCall: ToolCall): Promise<ToolResult> {
    const { name, args } = toolCall;

    switch (name) {
      case 'set_user_brief':
        return boolResult(setUserBrief(agent, args), name);
      case 'propose_task':
        return boolResult(proposeTask(agent, args), name);
      case 'complete_task':
        return boolResult(completeTask(agent, args), name);
      case 'deliver_project':
        return boolResult(deliverProject(agent, args), name);
      case 'share_insight':
        return boolResult(shareInsight(agent, args), name);
      case 'request_peer_review':
        return boolResult(requestPeerReview(agent, args), name);
      case 'hire_agent':
        return boolResult(hireAgent(agent, args), name);
      case 'set_agent_model':
        return setAgentModel(agent, args);
      case 'return_file':
        return returnFile(agent, args);
      case 'instagram_publish_photo':
        return instagramPublishPhotoTool(agent, args);
      case 'instagram_publish_reel':
        return instagramPublishReelTool(agent, args);
      case 'instagram_insights':
        return instagramInsightsTool(agent, args);
      case 'telegram_send_message':
        return telegramSendMessageTool(agent, args);
      case 'telegram_send_photo':
        return telegramSendPhotoTool(agent, args);
      case 'telegram_get_chat':
        return telegramGetChatTool(agent, args);
      default:
        console.warn(`[ToolRegistry] Unknown tool: ${name}`);
        return { ok: false, result: `FAILED: unknown tool ${name}` };
    }
  }

  /**
   * Lets the lead grow the team on demand. The role description is deliberately
   * left to the model so it derives the duties itself instead of echoing the user.
   */
  private static readonly HIRE_AGENT_TOOL = {
    type: 'function',
    function: {
      name: 'hire_agent',
      description:
        'Hire a specialist. Prefer a Ruflo catalog role (coder, tester, reviewer, architect, security-auditor, researcher, planner, github pr-manager, sparc-coder, ... 97 roles). YOU write responsibilities — do not ask the user.',
      parameters: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            description: 'Job title for the new agent, e.g. "Buxgalter". Keep it short.'
          },
          responsibilities: {
            type: 'string',
            description:
              'Your own analysis of the role: concrete duties, deliverables and boundaries. 2-4 sentences. This becomes the agent system prompt.'
          },
          color: { type: 'string', description: 'Optional hex colour, e.g. #F97316' }
        },
        required: ['role', 'responsibilities']
      }
    }
  };

  private static readonly SOCIAL_TOOLS = [
    {
      type: 'function',
      function: {
        name: 'instagram_publish_photo',
        description:
          'Publish a photo post to the connected Instagram business account. Requires a public https image_url (not base64).',
        parameters: {
          type: 'object',
          properties: {
            caption: { type: 'string', description: 'Post caption in Uzbek unless user asks otherwise' },
            image_url: { type: 'string', description: 'Public HTTPS URL of the image' },
          },
          required: ['caption', 'image_url'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'instagram_publish_reel',
        description: 'Publish a Reel. Requires a public https video_url.',
        parameters: {
          type: 'object',
          properties: {
            caption: { type: 'string' },
            video_url: { type: 'string', description: 'Public HTTPS URL of the video' },
          },
          required: ['caption', 'video_url'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'instagram_insights',
        description:
          'Fetch recent Instagram media stats (reach/impressions/likes when available) and store a summary in knowledge.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'telegram_send_message',
        description: 'Send a text message via the connected Telegram bot to the default chat/channel (or chat_id).',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            chat_id: { type: 'string', description: 'Optional override; defaults to saved chat' },
          },
          required: ['text'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'telegram_send_photo',
        description: 'Send a photo via Telegram bot. photo_url must be a public HTTPS URL.',
        parameters: {
          type: 'object',
          properties: {
            photo_url: { type: 'string' },
            caption: { type: 'string' },
            chat_id: { type: 'string' },
          },
          required: ['photo_url'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'telegram_get_chat',
        description: 'Inspect the configured Telegram chat/channel metadata.',
        parameters: {
          type: 'object',
          properties: {
            chat_id: { type: 'string' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_agent_model',
        description:
          'Change which LLM provider/model an agent uses (openai, gemini, or claude). Use when the user asks to switch models.',
        parameters: {
          type: 'object',
          properties: {
            agentId: { type: 'integer', description: 'Target agent index; defaults to self' },
            provider: { type: 'string', enum: ['openai', 'gemini', 'claude'] },
            model: { type: 'string', description: 'Model id e.g. gpt-4o-mini, gemini-2.0-flash, claude-sonnet-4-5' },
          },
          required: ['provider'],
        },
      },
    },
  ];

  private static readonly RETURN_FILE_TOOL = {
    type: 'function',
    function: {
      name: 'return_file',
      description:
        'Return a finished file to the user in the SAME format they sent (png→png, zip→zip, mp4→mp4, txt→txt). For images/videos you may pass a generation prompt as content (encoding=text). For code/text use encoding=text. For binary use encoding=base64.',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'e.g. parrot-edit.png or project.zip' },
          mime: { type: 'string', description: 'e.g. image/png, video/mp4, application/zip, text/plain' },
          content: { type: 'string', description: 'File text, generation prompt, or base64' },
          encoding: { type: 'string', enum: ['text', 'base64'] },
        },
        required: ['filename', 'mime', 'content'],
      },
    },
  };

  public static getDefinitions(agentIndex: number, phase: string, subagentsCount: number = 0): any[] {
    const isLead = agentIndex === 1;
    const isManager = subagentsCount > 0;
    const tools: any[] = [ToolRegistry.RETURN_FILE_TOOL];

    // 1. Idle Phase: Only Lead can set the brief
    if (phase === 'idle') {
      if (isLead) {
        tools.push({
          type: 'function',
          function: {
            name: 'set_user_brief',
            description: 'Start project with brief.',
            parameters: {
              type: 'object',
              properties: { brief: { type: 'string' } },
              required: ['brief']
            }
          }
        });
        tools.push(ToolRegistry.HIRE_AGENT_TOOL);
        tools.push(...ToolRegistry.SOCIAL_TOOLS);
      }
      return tools;
    }

    // 2. Working Phase: Common tools for everyone
    if (phase === 'working') {
      if (isLead || isManager) {
        tools.push({
          type: 'function',
          function: {
            name: 'propose_task',
            description: 'Assign task to agent.',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                agentId: { type: 'integer', description: 'Agent index' },
                requiresApproval: { type: 'boolean' }
              },
              required: ['title', 'description', 'agentId']
            }
          }
        });
      }

      tools.push(
        {
          type: 'function',
          function: {
            name: 'complete_task',
            description: 'Finish task. Output must be raw content, no introductions or credit for the work.',
            parameters: {
              type: 'object',
              properties: {
                taskId: { type: 'string' },
                output: { type: 'string', description: 'Task result in Markdown (e.g. code blocks, text, or research).' }
              },
              required: ['taskId', 'output']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'share_insight',
            description:
              'Publish a durable insight to the shared team knowledge base so other agents can reuse it.',
            parameters: {
              type: 'object',
              properties: {
                topic: { type: 'string', description: 'Short topic title' },
                insight: { type: 'string', description: 'The reusable finding or decision' },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional tags e.g. market, pricing, risk'
                }
              },
              required: ['topic', 'insight']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'request_peer_review',
            description:
              'Ask another agent to peer-review a task output. Creates a linked review task.',
            parameters: {
              type: 'object',
              properties: {
                taskId: { type: 'string' },
                reviewerAgentId: { type: 'integer', description: 'Agent index of the reviewer' },
                focus: { type: 'string', description: 'What the reviewer should focus on' }
              },
              required: ['taskId', 'reviewerAgentId', 'focus']
            }
          }
        },
      );

      tools.push(...ToolRegistry.SOCIAL_TOOLS);

      if (isLead) {
        tools.push(ToolRegistry.HIRE_AGENT_TOOL);
        tools.push({
          type: 'function',
          function: {
            name: 'deliver_project',
            description: 'Final delivery of the full project results.',
            parameters: {
              type: 'object',
              properties: { 
                output: { 
                  type: 'string', 
                  description: 'Full project document in Markdown. NO attribution needed.' 
                } 
              },
              required: ['output']
            }
          }
        });
      }
    }

    return tools;
  }
}

function boolResult(ok: boolean, name: string): ToolResult {
  return { ok, result: ok ? `OK: ${name}` : `FAILED: ${name}` };
}
