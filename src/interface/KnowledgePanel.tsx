import { BookOpen, Brain, Tag, X } from 'lucide-react';
import React from 'react';
import { useCoreStore } from '../integration/store/coreStore';
import { uz } from '../i18n/uz';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const KnowledgePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const sharedKnowledge = useCoreStore((s) => s.sharedKnowledge);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-violet-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-800">
              {uz.teamKnowledge}
            </h2>
            <span className="text-[10px] font-mono text-zinc-400 ml-1">
              {sharedKnowledge.length} {uz.insights}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sharedKnowledge.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
              <BookOpen size={28} className="mb-3 opacity-40" />
              <p className="text-xs font-medium">{uz.noInsights}</p>
              <p className="text-[11px] mt-1 max-w-xs">
                {uz.knowledgeHint}
              </p>
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
                <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">
                  {entry.insight}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-zinc-200 text-zinc-600"
                  >
                    {entry.authorName}
                  </span>
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
      </div>
    </div>
  );
};

export default KnowledgePanel;
