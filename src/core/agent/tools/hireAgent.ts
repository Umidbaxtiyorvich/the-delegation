import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';
import { useUiStore } from '../../../integration/store/uiStore';
import { useTeamStore, getActiveAgentSet } from '../../../integration/store/teamStore';
import { AgentNode, MAX_AGENTS, getAllAgents } from '../../../data/agents';
import { DEFAULT_MODELS } from '../../llm/constants';

/** Palette for newly hired agents, picked by slot so colours stay distinguishable. */
const HIRE_COLORS = ['#F97316', '#0EA5E9', '#A855F7', '#14B8A6', '#EAB308', '#EF4444', '#8B5CF6'];

function slugify(role: string): string {
  const base = role
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return base || 'agent';
}

/** Deep-clones the tree while appending `child` to the node with `parentIndex`. */
function insertChild(node: AgentNode, parentIndex: number, child: AgentNode): AgentNode {
  const subagents = node.subagents?.map((s) => insertChild(s, parentIndex, child));

  if (node.index === parentIndex) {
    return { ...node, subagents: [...(subagents || []), child] };
  }

  return subagents ? { ...node, subagents } : { ...node };
}

export function hireAgent(
  agent: AgentActionContext,
  args: { role: string; responsibilities: string; color?: string }
): boolean {
  const { role, responsibilities } = args;

  if (!role?.trim() || !responsibilities?.trim()) {
    console.warn('[hireAgent] role va responsibilities majburiy');
    return false;
  }

  const system = getActiveAgentSet();
  const existing = getAllAgents(system);

  if (existing.length >= MAX_AGENTS) {
    useCoreStore.getState().addLogEntry({
      agentIndex: agent.data.index,
      action: `yangi agent olishga urindi ("${role}") — limit ${MAX_AGENTS} ta agent toʻlgan`,
    });
    return false;
  }

  const duplicate = existing.find(
    (a) => a.name.trim().toLowerCase() === role.trim().toLowerCase()
  );
  if (duplicate) {
    useCoreStore.getState().addLogEntry({
      agentIndex: agent.data.index,
      action: `"${role}" roli allaqachon mavjud — [${duplicate.index}] ${duplicate.name}`,
    });
    return false;
  }

  const takenIndices = new Set(existing.map((a) => a.index));
  if (takenIndices.has(system.user.index)) takenIndices.add(system.user.index);
  let index = 1;
  while (takenIndices.has(index) || index === system.user.index) index++;

  const parent = existing.find((a) => a.index === agent.data.index) || system.leadAgent;
  const parentPos = parent.position || { x: 0, y: 130 };

  // Sit to the right of the rightmost sibling so the flow graph never stacks nodes.
  const siblings = parent.subagents || [];
  const rightmost = siblings.reduce(
    (max, s) => (s.position && s.position.x > max ? s.position.x : max),
    Number.NEGATIVE_INFINITY
  );
  const x = Number.isFinite(rightmost) ? rightmost + 200 : parentPos.x;

  const newAgent: AgentNode = {
    id: `${slugify(role)}-${index}`,
    index,
    name: role.trim(),
    description: responsibilities.trim(),
    color: args.color?.match(/^#[0-9a-fA-F]{6}$/)
      ? args.color
      : HIRE_COLORS[(index - 1) % HIRE_COLORS.length],
    model: parent.model || DEFAULT_MODELS.text,
    position: {
      x,
      y: parentPos.y + 150,
    },
  };

  const nextLead = insertChild(system.leadAgent, parent.index, newAgent);

  // Team first: the 3D layer reads the roster when it resizes its instance buffers.
  useTeamStore.getState().updateActiveSystem({ leadAgent: nextLead });

  // Instance buffers are indexed directly, so they must span the highest index.
  const maxIndex = Math.max(system.user.index, index, ...existing.map((a) => a.index));
  useUiStore.getState().setInstanceCount(maxIndex + 1);

  useCoreStore.getState().addLogEntry({
    agentIndex: agent.data.index,
    action: `yangi agent yolladi: [${index}] ${newAgent.name}`,
  });

  return true;
}
