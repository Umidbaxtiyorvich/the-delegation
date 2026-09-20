import { AgentActionContext } from '../ToolRegistry';
import { AgentNode } from '../../../data/agents';
import { useCoreStore } from '../../../integration/store/coreStore';
import { getActiveAgentSet, useTeamStore } from '../../../integration/store/teamStore';
import {
  defaultModelForProvider,
  inferProviderFromModel,
  PROVIDER_MODELS,
} from '../../llm/constants';
import type { LLMProviderId } from '../../llm/types';

function mapAgent(
  node: AgentNode,
  targetIndex: number,
  updates: Partial<Pick<AgentNode, 'provider' | 'model'>>,
): AgentNode {
  const next: AgentNode =
    node.index === targetIndex ? { ...node, ...updates } : { ...node };
  if (next.subagents?.length) {
    next.subagents = next.subagents.map((s) => mapAgent(s, targetIndex, updates));
  }
  return next;
}

export function setAgentModel(
  agent: AgentActionContext,
  args: {
    agentId?: number;
    agent_id?: number;
    provider?: LLMProviderId;
    model?: string;
  },
): { ok: boolean; result: string } {
  const targetIndex = Number(args.agentId ?? args.agent_id ?? agent.data.index);
  if (!Number.isFinite(targetIndex)) {
    return { ok: false, result: 'FAILED: agentId notoʻgʻri' };
  }

  let provider = args.provider;
  let model = args.model?.trim();

  if (model && !provider) {
    provider = inferProviderFromModel(model);
  }
  if (provider && !model) {
    model = defaultModelForProvider(provider);
  }
  if (!provider || !model) {
    return { ok: false, result: 'FAILED: provider yoki model kerak' };
  }

  const allowed = PROVIDER_MODELS[provider] || [];
  if (allowed.length && !allowed.includes(model)) {
    // Allow custom model strings but prefer known list
  }

  const system = getActiveAgentSet();
  const nextLead = mapAgent(system.leadAgent, targetIndex, { provider, model });
  useTeamStore.getState().updateActiveSystem({ leadAgent: nextLead });

  useCoreStore.getState().addLogEntry({
    agentIndex: agent.data.index,
    action: `agent [${targetIndex}] model → ${provider}/${model}`,
  });

  return { ok: true, result: `OK: agent ${targetIndex} → ${provider} / ${model}` };
}
