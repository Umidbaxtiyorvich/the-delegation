import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';
import {
  instagramInsights,
  instagramPublishPhoto,
  instagramPublishReel,
} from '../../../integration/social/socialApi';

export async function instagramPublishPhotoTool(
  agent: AgentActionContext,
  args: { caption: string; image_url?: string; imageUrl?: string },
): Promise<{ ok: boolean; result: string }> {
  try {
    const imageUrl = args.image_url || args.imageUrl;
    const published = await instagramPublishPhoto({
      caption: args.caption || '',
      imageUrl,
    });
    useCoreStore.getState().addLogEntry({
      agentIndex: agent.data.index,
      action: `instagram photo published: ${published.id}`,
    });
    return { ok: true, result: `OK: published media_id=${published.id}` };
  } catch (e) {
    return { ok: false, result: `FAILED: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function instagramPublishReelTool(
  agent: AgentActionContext,
  args: { caption: string; video_url?: string; videoUrl?: string },
): Promise<{ ok: boolean; result: string }> {
  try {
    const videoUrl = args.video_url || args.videoUrl || '';
    const published = await instagramPublishReel({
      caption: args.caption || '',
      videoUrl,
    });
    useCoreStore.getState().addLogEntry({
      agentIndex: agent.data.index,
      action: `instagram reel published: ${published.id}`,
    });
    return { ok: true, result: `OK: published reel_id=${published.id}` };
  } catch (e) {
    return { ok: false, result: `FAILED: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function instagramInsightsTool(
  agent: AgentActionContext,
  _args: Record<string, unknown> = {},
): Promise<{ ok: boolean; result: string }> {
  try {
    const summary = await instagramInsights();
    useCoreStore.getState().addLogEntry({
      agentIndex: agent.data.index,
      action: 'instagram insights oʻqildi',
    });
    useCoreStore.getState().addSharedInsight({
      topic: 'Instagram insights',
      insight: summary.slice(0, 1200),
      tags: ['instagram', 'insights', 'growth'],
      authorIndex: agent.data.index,
      authorName: agent.data.name,
    });
    return { ok: true, result: summary };
  } catch (e) {
    return { ok: false, result: `FAILED: ${e instanceof Error ? e.message : String(e)}` };
  }
}
