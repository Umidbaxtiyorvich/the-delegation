import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';

export function shareInsight(
  agent: AgentActionContext,
  args: { topic: string; insight: string; tags?: string[] }
): boolean {
  const store = useCoreStore.getState();
  const { topic, insight, tags } = args;
  if (!topic?.trim() || !insight?.trim()) return false;

  store.addSharedInsight({
    topic: topic.trim(),
    insight: insight.trim(),
    tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
    authorIndex: agent.data.index,
    authorName: agent.data.name,
  });

  store.addLogEntry({
    agentIndex: agent.data.index,
    action: `shared insight: "${topic.trim()}"`,
  });

  return true;
}
