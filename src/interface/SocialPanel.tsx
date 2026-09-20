import { Loader2, RefreshCw, Send, Share2, X } from 'lucide-react';
import React, { useState } from 'react';
import { useIntegrationsStore } from '../integration/store/integrationsStore';
import { refreshRecentMedia } from '../integration/social/socialApi';
import { useSceneManager } from '../simulation/SceneContext';
import { uz } from '../i18n/uz';

interface Props {
  onClose: () => void;
}

const SocialPanel: React.FC<Props> = ({ onClose }) => {
  const { recentMedia, lastInsightsSummary, instagram, autoPost } = useIntegrationsStore();
  const scene = useSceneManager();
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshRecentMedia();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const postNow = async () => {
    const brain = scene?.getLeadBrain();
    if (!brain) {
      setError('Lead agent hali tayyor emas');
      return;
    }
    setPosting(true);
    setError(null);
    try {
      await brain.sparkAutoPost();
      useIntegrationsStore.getState().markAutoPostedToday();
      await refreshRecentMedia().catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 pointer-events-auto overflow-hidden">
      <div onClick={onClose} className="absolute inset-0 bg-white/60 backdrop-blur-xl" />
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] p-8 md:p-10 border border-zinc-100">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-300 hover:text-zinc-600 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="mb-6 flex items-start justify-between gap-4 pr-8">
          <div>
            <h2 className="text-3xl font-black text-darkDelegation tracking-tight mb-1 flex items-center gap-2">
              <Share2 size={28} />
              {uz.socialTitle}
            </h2>
            <p className="text-zinc-400 text-sm">
              {instagram.accountName ? `@${instagram.accountName}` : uz.integrationsHint.slice(0, 80) + '…'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl text-[11px] text-red-600">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={refresh}
            disabled={loading || !instagram.accessToken}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {uz.socialRefresh}
          </button>
          <button
            type="button"
            onClick={postNow}
            disabled={posting || !instagram.accessToken || !(instagram.username || instagram.igUserId)}
            className="flex items-center gap-2 px-4 py-2 bg-darkDelegation text-white rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer"
          >
            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {uz.socialPostNow}
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 mb-4">
          {uz.socialScheduleHint}
          {autoPost.enabled ? ` · ${autoPost.hourLocal}:00` : ''}
        </p>

        {lastInsightsSummary && (
          <pre className="mb-6 p-4 bg-zinc-50 rounded-2xl text-[11px] text-zinc-600 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
            {lastInsightsSummary}
          </pre>
        )}

        {!recentMedia.length ? (
          <p className="text-sm text-zinc-400">{uz.noRecentPosts}</p>
        ) : (
          <ul className="space-y-3">
            {recentMedia.map((m) => (
              <li key={m.id} className="border-b border-zinc-100 pb-3">
                <div className="flex justify-between gap-3 text-[11px] text-zinc-400 mb-1">
                  <span>{m.mediaType || 'MEDIA'}</span>
                  <span>
                    {uz.likes} {m.likeCount ?? '—'} · {uz.comments} {m.commentsCount ?? '—'}
                  </span>
                </div>
                <p className="text-sm text-zinc-700 line-clamp-2">{m.caption || m.id}</p>
                {m.permalink && (
                  <a
                    href={m.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-darkDelegation underline"
                  >
                    permalink
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SocialPanel;
