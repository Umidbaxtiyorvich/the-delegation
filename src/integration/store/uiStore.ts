import { create } from 'zustand';
import { getAllAgents } from '../../data/agents';
import { AgentState, CharacterState } from '../../types';
import { useTeamStore, getActiveAgentSet } from './teamStore';
import { DEFAULT_MODELS, DEFAULT_OPENAI_BASE_URL } from '../../core/llm/constants';

function loadLlmConfig() {
  try {
    const saved = localStorage.getItem('byok-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.apiKey) {
        return {
          ...parsed,
          provider: 'openai' as const,
          baseUrl: parsed.baseUrl || (process.env.OPENAI_BASE_URL as string) || DEFAULT_OPENAI_BASE_URL,
          model: parsed.model || (process.env.OPENAI_MODEL as string) || DEFAULT_MODELS.text,
          embedModel: parsed.embedModel || (process.env.OPENAI_EMBED_MODEL as string) || DEFAULT_MODELS.embed,
        };
      }
    }
  } catch { /* ignore */ }

  const envKey = (process.env.OPENAI_API_KEY as string) || '';
  return {
    apiKey: envKey,
    baseUrl: (process.env.OPENAI_BASE_URL as string) || DEFAULT_OPENAI_BASE_URL,
    model: (process.env.OPENAI_MODEL as string) || DEFAULT_MODELS.text,
    embedModel: (process.env.OPENAI_EMBED_MODEL as string) || DEFAULT_MODELS.embed,
    provider: 'openai' as const,
  };
}

export const useUiStore = create<CharacterState>()(
  (set) => ({
    isThinking: false,
    instanceCount: getAllAgents(getActiveAgentSet()).length + 1,

    selectedNpcIndex: null,
    selectedPosition: null,
    hoveredNpcIndex: null,
    hoveredPoiId: null,
    hoveredPoiLabel: null,
    hoverPosition: null,
    npcScreenPositions: {},
    isChatting: false,
    isTyping: false,
    chatMessages: [],
    inspectorTab: 'info',
    agentStatuses: {},
    setAgentStatus: (index: number, status: AgentState) => set((s) => ({
      agentStatuses: { ...s.agentStatuses, [index]: status }
    })),

    isBYOKOpen: false,
    byokError: null,
    setBYOKOpen: (open: boolean, error: string | null = null) =>
      set({ isBYOKOpen: open, byokError: error }),

    activeAuditTaskId: null,
    setActiveAuditTaskId: (taskId: string | null) => set({ activeAuditTaskId: taskId }),

    llmConfig: loadLlmConfig(),

    setThinking: (isThinking: boolean) => set({ isThinking }),
    setIsTyping: (isTyping: boolean) => set({ isTyping }),
    setInspectorTab: (tab: 'info' | 'chat') => set({ inspectorTab: tab }),
    setInstanceCount: (count: number) => set({ instanceCount: count }),

    setSelectedNpc: (index: number | null) => set({
      selectedNpcIndex: index,
      selectedPosition: null,
    }),
    setSelectedPosition: (pos: { x: number; y: number } | null) => set({ selectedPosition: pos }),
    setHoveredNpc: (index: number | null, pos: { x: number; y: number } | null) => set({
      hoveredNpcIndex: index,
      hoverPosition: pos,
      hoveredPoiId: null,
      hoveredPoiLabel: null,
    }),
    setHoveredPoi: (id: string | null, label: string | null, pos: { x: number; y: number } | null) => set({
      hoveredPoiId: id,
      hoveredPoiLabel: label,
      hoverPosition: pos,
      hoveredNpcIndex: null,
    }),
    setLlmConfig: (config) => set((s) => ({ llmConfig: { ...s.llmConfig, ...config } })),
    setChatting: (isChatting: boolean) => set((s) => ({
      isChatting,
      isTyping: isChatting ? s.isTyping : false,
      isThinking: isChatting ? s.isThinking : false,
      chatMessages: isChatting ? s.chatMessages : []
    })),
  })
);

useTeamStore.subscribe((state, prevState) => {
  if (state.selectedAgentSetId !== prevState.selectedAgentSetId) {
    const system = getActiveAgentSet();
    useUiStore.getState().setInstanceCount(getAllAgents(system).length + 1);
  }
});
