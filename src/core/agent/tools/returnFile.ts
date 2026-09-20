import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';
import { toReturnedFile, type ReturnedFile } from '../../chat/attachments';
import { createProviderFor, resolveApiKey } from '../../llm/providers/createProvider';
import { useUiStore } from '../../../integration/store/uiStore';

function attachToHistory(agentIndex: number, file: ReturnedFile) {
  useCoreStore.setState((s) => {
    const hist = [...(s.agentHistories[agentIndex] || [])];
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i].role === 'assistant') {
        hist[i] = {
          ...hist[i],
          metadata: { ...hist[i].metadata, returnedFile: file },
        };
        break;
      }
    }
    return { agentHistories: { ...s.agentHistories, [agentIndex]: hist } };
  });
}

export async function returnFile(
  agent: AgentActionContext,
  args: { filename: string; mime: string; content: string; encoding?: 'text' | 'base64' },
): Promise<{ ok: boolean; result: string }> {
  const filename = (args.filename || 'natija.txt').trim();
  const mime = (args.mime || 'text/plain').trim();
  let content = args.content || '';
  let encoding: 'text' | 'base64' = args.encoding === 'base64' ? 'base64' : 'text';

  if (!content.trim()) {
    return { ok: false, result: 'FAILED: return_file — content boʻsh' };
  }

  const looksLikePrompt = encoding === 'text' && !content.startsWith('data:') && content.length < 4000;
  const llmConfig = useUiStore.getState().llmConfig;
  const hist = useCoreStore.getState().agentHistories[agent.data.index] || [];
  const lastUser = [...hist].reverse().find((m) => m.role === 'user');
  const refImages = (lastUser?.metadata?.attachments || lastUser?.images || []) as any[];
  const imageUrls = Array.isArray(refImages)
    ? refImages
        .map((a) => (typeof a === 'string' ? a : a?.dataUrl))
        .filter((u: string) => typeof u === 'string' && u.startsWith('data:image'))
    : [];

  try {
    if (looksLikePrompt && mime.startsWith('image/') && (resolveApiKey(llmConfig, 'gemini') || resolveApiKey(llmConfig, 'openai'))) {
      const providerId = resolveApiKey(llmConfig, 'gemini') ? 'gemini' : 'openai';
      const { provider } = createProviderFor({ ...llmConfig, provider: providerId }, { provider: providerId });
      const gen = provider as any;
      if (typeof gen.generateImage === 'function') {
        const model = providerId === 'gemini' ? 'gemini-2.5-flash-image' : 'dall-e-3';
        const result = await gen.generateImage(content, model, undefined, {}, imageUrls);
        if (result?.data) {
          content = result.data;
          encoding = 'base64';
        }
      }
    } else if (looksLikePrompt && mime.startsWith('video/') && llmConfig.keys?.gemini) {
      const { provider } = createProviderFor({ ...llmConfig, provider: 'gemini' }, { provider: 'gemini' });
      const gen = provider as any;
      if (typeof gen.generateVideo === 'function') {
        const result = await gen.generateVideo(content, 'veo-3.1-generate-preview', undefined, {}, imageUrls);
        if (result?.videoUrl) {
          const file = { filename, mime, dataUrl: result.videoUrl };
          attachToHistory(agent.data.index, file);
          useCoreStore.getState().addLogEntry({
            agentIndex: agent.data.index,
            action: `fayl qaytardi: ${filename}`,
          });
          return { ok: true, result: `OK: fayl tayyor — ${filename}` };
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, result: `FAILED: generatsiya — ${msg}` };
  }

  const file = toReturnedFile(filename, mime, content, encoding);
  attachToHistory(agent.data.index, file);
  useCoreStore.getState().addLogEntry({
    agentIndex: agent.data.index,
    action: `fayl qaytardi: ${filename}`,
  });
  return { ok: true, result: `OK: fayl tayyor — ${filename}` };
}
