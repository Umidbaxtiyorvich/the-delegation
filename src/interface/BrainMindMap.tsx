import React, { useMemo, useState } from 'react';
import type { AgentNode } from '../data/agents';
import type { SharedInsight } from '../integration/store/coreStore';

type Props = {
  agents: AgentNode[];
  knowledge: SharedInsight[];
};

export const BrainMindMap: React.FC<Props> = ({ agents, knowledge }) => {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(
    agents[0]?.index ?? null,
  );

  const byAgent = useMemo(() => {
    const map = new Map<number, SharedInsight[]>();
    for (const agent of agents) map.set(agent.index, []);
    for (const k of knowledge) {
      const targets =
        k.assignedAgentIndexes?.length
          ? k.assignedAgentIndexes
          : agents[0]
            ? [agents[0].index]
            : [];
      for (const idx of targets) {
        if (!map.has(idx)) map.set(idx, []);
        map.get(idx)!.push(k);
      }
    }
    return map;
  }, [agents, knowledge]);

  const selected = agents.find((a) => a.index === selectedAgent) ?? agents[0];
  const selectedKnowledge = selected ? byAgent.get(selected.index) ?? [] : [];

  const width = 640;
  const height = 360;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.32;

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[280px] shrink-0 rounded-xl bg-zinc-50 border border-zinc-100">
        {/* hub */}
        <circle cx={cx} cy={cy} r={36} fill="#7C3AED" opacity={0.15} />
        <circle cx={cx} cy={cy} r={22} fill="#7C3AED" />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="700">
          MIYA
        </text>

        {agents.map((agent, i) => {
          const angle = (-Math.PI / 2) + (i / Math.max(agents.length, 1)) * Math.PI * 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const count = byAgent.get(agent.index)?.length ?? 0;
          const active = selected?.index === agent.index;
          return (
            <g
              key={agent.id}
              className="cursor-pointer"
              onClick={() => setSelectedAgent(agent.index)}
            >
              <line
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={active ? agent.color : '#d4d4d8'}
                strokeWidth={active ? 2.5 : 1}
              />
              <circle
                cx={x}
                cy={y}
                r={active ? 28 : 24}
                fill={agent.color}
                opacity={active ? 1 : 0.85}
                stroke={active ? '#18181b' : 'white'}
                strokeWidth={active ? 2 : 1}
              />
              <text
                x={x}
                y={y - 2}
                textAnchor="middle"
                fill="white"
                fontSize="8"
                fontWeight="800"
              >
                {agent.name.split(' ')[0].slice(0, 8)}
              </text>
              <text
                x={x}
                y={y + 10}
                textAnchor="middle"
                fill="white"
                fontSize="9"
                fontWeight="700"
              >
                {count}
              </text>
            </g>
          );
        })}
      </svg>

      {selected && (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-zinc-100 bg-white p-3">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: selected.color }}
            />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800">
              {selected.name} miyasi
            </h3>
            <span className="text-[10px] font-mono text-zinc-400">
              {selectedKnowledge.length} ta bilim
            </span>
          </div>
          {selectedKnowledge.length === 0 ? (
            <p className="text-[11px] text-zinc-400 py-6 text-center">
              Bu agentga hali bilim biriktirilmagan.
            </p>
          ) : (
            <div className="space-y-2">
              {[...selectedKnowledge].reverse().slice(0, 40).map((k) => (
                <div key={k.id} className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2">
                  <p className="text-xs font-bold text-zinc-800 truncate">{k.topic}</p>
                  <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{k.insight}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrainMindMap;
