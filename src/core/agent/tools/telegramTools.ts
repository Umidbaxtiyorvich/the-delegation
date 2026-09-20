import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';
import {
  telegramGetChat,
  telegramSendMessage,
  telegramSendPhoto,
} from '../../../integration/social/socialApi';

export async function telegramSendMessageTool(
  agent: AgentActionContext,
  args: { text: string; chat_id?: string; chatId?: string },
): Promise<{ ok: boolean; result: string }> {
  try {
    const sent = await telegramSendMessage({
      text: args.text || '',
      chatId: args.chat_id || args.chatId,
    });
    useCoreStore.getState().addLogEntry({
      agentIndex: agent.data.index,
      action: `telegram message #${sent.message_id}`,
    });
    return { ok: true, result: `OK: message_id=${sent.message_id}` };
  } catch (e) {
    return { ok: false, result: `FAILED: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function telegramSendPhotoTool(
  agent: AgentActionContext,
  args: {
    photo_url?: string;
    photoUrl?: string;
    caption?: string;
    chat_id?: string;
    chatId?: string;
  },
): Promise<{ ok: boolean; result: string }> {
  try {
    const sent = await telegramSendPhoto({
      photoUrl: args.photo_url || args.photoUrl || '',
      caption: args.caption,
      chatId: args.chat_id || args.chatId,
    });
    useCoreStore.getState().addLogEntry({
      agentIndex: agent.data.index,
      action: `telegram photo #${sent.message_id}`,
    });
    return { ok: true, result: `OK: message_id=${sent.message_id}` };
  } catch (e) {
    return { ok: false, result: `FAILED: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function telegramGetChatTool(
  agent: AgentActionContext,
  args: { chat_id?: string; chatId?: string } = {},
): Promise<{ ok: boolean; result: string }> {
  try {
    const info = await telegramGetChat(args.chat_id || args.chatId);
    useCoreStore.getState().addLogEntry({
      agentIndex: agent.data.index,
      action: 'telegram getChat',
    });
    return { ok: true, result: info };
  } catch (e) {
    return { ok: false, result: `FAILED: ${e instanceof Error ? e.message : String(e)}` };
  }
}
