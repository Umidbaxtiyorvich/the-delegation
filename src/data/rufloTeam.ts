import { DEFAULT_MODELS } from '../core/llm/constants';
import type { AgentNode, AgenticSystem } from './agents';
import { RUFLO_AGENTS } from './rufloAgents';

const COLORS = [
  '#0EA5E9', '#2563EB', '#8B5CF6', '#059669', '#F97316', '#EAB308',
  '#14B8A6', '#EF4444', '#EC4899', '#6366F1', '#84CC16', '#F59E0B',
];

export function buildRufloSwarmTeam(): AgenticSystem {
  const queenDef =
    RUFLO_AGENTS.find((a) => a.id === 'queen-coordinator') || RUFLO_AGENTS[0];
  const rest = RUFLO_AGENTS.filter((a) => a.id !== queenDef.id);
  const cols = 12;

  const subagents: AgentNode[] = rest.map((a, i) => ({
    id: a.id,
    index: i + 2,
    name: a.name,
    description: a.description,
    color: COLORS[i % COLORS.length],
    model: DEFAULT_MODELS.text,
    position: {
      x: ((i % cols) - (cols - 1) / 2) * 170,
      y: 280 + Math.floor(i / cols) * 130,
    },
  }));

  return {
    id: 'ruflo-swarm',
    teamName: 'Ruflo Swarm',
    teamType: 'Meta-harness',
    teamDescription: `ruvnet/ruflo — ${1 + rest.length} agent: Queen + barcha mutaxassislar bir maydonda.`,
    color: '#0EA5E9',
    outputType: 'text',
    outputModel: DEFAULT_MODELS.text,
    outputAutoApprove: true,
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
    leadAgent: {
      id: queenDef.id,
      index: 1,
      name: queenDef.name,
      description: queenDef.description,
      color: '#0EA5E9',
      model: DEFAULT_MODELS.text,
      humanInTheLoop: true,
      avatar: { gender: 'female' },
      position: { x: 0, y: 140 },
      subagents,
    },
  };
}
