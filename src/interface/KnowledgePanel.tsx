import { BookOpen, Brain, FolderOpen, Network, Tag, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { getAllAgents } from '../data/agents';
import {
  buildImportSelection,
  loadConversationsFromFile,
  loadConversationsFromFileList,
} from '../core/knowledge/importChatHistory';
import { useCoreStore } from '../integration/store/coreStore';
import { useActiveTeam } from '../integration/store/teamStore';
import { uz } from '../i18n/uz';
import BrainMindMap from './BrainMindMap';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

type Tab = 'list' | 'brain';

const KnowledgePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const sharedKnowledge = useCoreStore((s) => s.sharedKnowledge);
  const chatImportAt = useCoreStore((s) => s.chatImportAt);
  const importSharedInsights = useCoreStore((s) => s.importSharedInsights);
  const setAgentHistory = useCoreStore((s) => s.setAgentHistory);
  const setAgentSummary = useCoreStore((s) => s.setAgentSummary);
  const startProject = useCoreStore((s) => s.startProject);
  const team = useActiveTeam();
  const agents = getAllAgents(team);

  const folderRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>(sharedKnowledge.length > 0 ? 'brain' : 'list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(
    chatImportAt && sharedKnowledge.length > 0
      ? `${uz.importAlreadyDone}: ${sharedKnowledge.length} ${uz.insights}`
      : null,
  );
  const alreadyImported = sharedKnowledge.length > 0;

  const placeEverything = async (parsed: Awaited<ReturnType<typeof loadConversationsFromFile>>) => {
    if (!parsed.length) throw new Error('Matnli suhbat topilmadi');

    const payload = buildImportSelection(parsed, {
      compact: true,
      agents: agents.map((a) => ({
        index: a.index,
        name: a.name,
        description: a.description,
      })),
    });

    const count = importSharedInsights(payload.insights);
    setAgentHistory(team.leadAgent.index, payload.ceoHistory);
    startProject(payload.brief);

    // Har bir agent miyasiga o‘z bilimlari + qisqa seed history
    for (const agent of agents) {
      const mine = payload.insights.filter((i) =>
        i.assignedAgentIndexes?.includes(agent.index),
      );
      const pool = mine.length ? mine : payload.insights.slice(0, 10);
      const lines = pool.slice(0, 12).map((i) => `• ${i.topic}`);
      setAgentSummary(
        agent.index,
        `ChatGPT import — ${mine.length || pool.length} ta bilim (jamoa):\n${lines.join('\n')}`,
      );

      // Lead already has CEO dialogue; others get a durable brain seed that survives F5.
      if (agent.index !== team.leadAgent.index) {
        setAgentHistory(agent.index, [
          {
            role: 'user',
            content:
              `[ChatGPT import] Sizning miyangizga ${mine.length || pool.length} ta bilim biriktirildi. Asosiy mavzular:\n${lines.join('\n')}\n\nJamoa bilim bazasidan foydalanib ishlang.`,
            metadata: { internal: true, source: 'chatgpt_import' },
          },
        ]);
      }
    }

    setStatus(
      `${uz.importSuccess}: ${count} suhbat saqlandi (F5 dan keyin ham qoladi). Barcha agentlar miyasi yangilandi.`,
    );
    setTab('brain');
  };

  const onPickFolder = async (list: FileList | null) => {
    if (!list?.length) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const parsed = await loadConversationsFromFileList(list);
      await placeEverything(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : uz.importError);
    } finally {
      setLoading(false);
      if (folderRef.current) folderRef.current.value = '';
    }
  };

  const onPickZip = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const parsed = await loadConversationsFromFile(file);
      await placeEverything(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : uz.importError);
    } finally {
      setLoading(false);
      if (zipRef.current) zipRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Brain size={16} className="text-violet-600 shrink-0" />
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-800 truncate">
              {uz.teamKnowledge}
            </h2>
            <span className="text-[10px] font-mono text-zinc-400 ml-1 shrink-0">
              {sharedKnowledge.length} {uz.insights}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              ref={folderRef}
              type="file"
              // @ts-expect-error webkitdirectory is non-standard but widely supported
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => void onPickFolder(e.target.files)}
            />
            <input
              ref={zipRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => void onPickZip(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => folderRef.current?.click()}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer disabled:opacity-50 ${
                alreadyImported
                  ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  : 'bg-violet-600 text-white hover:bg-violet-700'
              }`}
              title={alreadyImported ? uz.importAgainHint : uz.importFolderHint}
            >
              <FolderOpen size={12} />
              {loading ? uz.importLoading : alreadyImported ? uz.importAgain : uz.importFolder}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => zipRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload size={12} />
              ZIP
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 pt-3 flex items-center gap-2 border-b border-zinc-50">
          <button
            type="button"
            onClick={() => setTab('list')}
            className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wide rounded-t-lg cursor-pointer ${
              tab === 'list' ? 'bg-zinc-100 text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {uz.knowledgeList}
          </button>
          <button
            type="button"
            onClick={() => setTab('brain')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide rounded-t-lg cursor-pointer ${
              tab === 'brain' ? 'bg-violet-50 text-violet-700' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <Network size={12} />
            {uz.brainMap}
          </button>
        </div>

        {(error || status) && (
          <div
            className={`px-5 py-2 text-[11px] font-medium border-b ${
              error
                ? 'bg-red-50 text-red-700 border-red-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}
          >
            {error ?? status}
          </div>
        )}

        {tab === 'brain' ? (
          <div className="flex-1 min-h-0 p-4 flex flex-col">
            {agents.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-16">Agentlar yoʻq.</p>
            ) : (
              <BrainMindMap agents={agents} knowledge={sharedKnowledge} />
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sharedKnowledge.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
                <BookOpen size={28} className="mb-3 opacity-40" />
                <p className="text-xs font-medium">{uz.noInsights}</p>
                <p className="text-[11px] mt-1 max-w-sm">{uz.knowledgeHint}</p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => folderRef.current?.click()}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide bg-violet-600 text-white hover:bg-violet-700 cursor-pointer"
                >
                  <FolderOpen size={12} />
                  {uz.importFolder}
                </button>
                <p className="text-[10px] text-zinc-400 mt-2 max-w-xs">{uz.importFolderHint}</p>
              </div>
            ) : (
              [...sharedKnowledge].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3.5 hover:border-violet-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <h3 className="text-sm font-bold text-zinc-800 leading-snug">{entry.topic}</h3>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      {formatTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {entry.insight}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-zinc-200 text-zinc-600">
                      {entry.authorName}
                    </span>
                    {entry.assignedAgentIndexes?.map((idx) => {
                      const agent = agents.find((a) => a.index === idx);
                      if (!agent) return null;
                      return (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ background: agent.color }}
                        >
                          {agent.name}
                        </span>
                      );
                    })}
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100"
                      >
                        <Tag size={8} />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgePanel;
