import React from 'react';
import { getAllAgents } from '../../data/agents';
import { useActiveTeam } from '../../integration/store/teamStore';
import { useUiStore } from '../../integration/store/uiStore';
import { AgentPortrait } from './AgentPortrait';

/** All team faces stay visible on the work floor. */
export function AgentRoster() {
  const team = useActiveTeam();
  const agents = getAllAgents(team);
  const { selectedNpcIndex, setSelectedNpc, setChatting } = useUiStore();

  return (
    <div className="absolute left-3 right-3 bottom-3 z-20 pointer-events-auto">
      <div className="bg-white/90 backdrop-blur-md border border-black/5 rounded-2xl shadow-lg px-3 py-2">
        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
          Jamoa · {agents.length} agent · hammasi shu yerda
        </p>
        <div className="max-h-44 overflow-y-auto">
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
          {agents.map((agent) => {
            const active = selectedNpcIndex === agent.index;
            return (
              <button
                key={agent.id}
                type="button"
                title={agent.name}
                onClick={() => {
                  setSelectedNpc(agent.index);
                  setChatting(true);
                }}
                className={`flex flex-col items-center gap-0.5 min-w-0 ${active ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
              >
                <div
                  className={`rounded-lg p-0.5 ${active ? 'ring-2 ring-offset-1' : 'border border-zinc-100'}`}
                  style={{ ['--tw-ring-color' as string]: agent.color }}
                >
                  <AgentPortrait subject={agent} size={28} />
                </div>
                <span className="text-[7px] font-bold text-zinc-600 truncate w-full text-center leading-tight">
                  {agent.name}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
