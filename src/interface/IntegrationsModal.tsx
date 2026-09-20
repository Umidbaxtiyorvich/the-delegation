import { CheckCircle2, Link2, Loader2, X } from 'lucide-react';
import React, { useState } from 'react';
import { useIntegrationsStore } from '../integration/store/integrationsStore';
import { verifyInstagram, verifyTelegram } from '../integration/social/socialApi';
import { uz } from '../i18n/uz';

interface Props {
  onClose: () => void;
}

const IntegrationsModal: React.FC<Props> = ({ onClose }) => {
  const {
    instagram,
    telegram,
    autoPost,
    setInstagram,
    setTelegram,
    setAutoPost,
    clearSecrets,
  } = useIntegrationsStore();

  const [igToken, setIgToken] = useState(instagram.accessToken);
  const [igUsername, setIgUsername] = useState(instagram.username || instagram.accountName || '');
  const [tgToken, setTgToken] = useState(telegram.botToken);
  const [tgChat, setTgChat] = useState(telegram.defaultChatId);
  const [busy, setBusy] = useState<'ig' | 'tg' | 'save' | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const persistFields = () => {
    setInstagram({
      accessToken: igToken.trim(),
      username: igUsername.trim().replace(/^@/, ''),
    });
    setTelegram({ botToken: tgToken.trim(), defaultChatId: tgChat.trim() });
  };

  const handleSave = async () => {
    setBusy('save');
    setError(null);
    try {
      persistFields();
      if (igToken.trim() && (igUsername.trim() || /^IG/i.test(igToken.trim()))) {
        await verifyInstagram(igUsername.trim() || undefined);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const testIg = async () => {
    setBusy('ig');
    setError(null);
    setStatus(null);
    try {
      persistFields();
      const me = await verifyInstagram(igUsername.trim() || undefined);
      setStatus(`${uz.connectedAs}: @${me.username || me.name || me.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const testTg = async () => {
    setBusy('tg');
    setError(null);
    setStatus(null);
    try {
      setTelegram({ botToken: tgToken.trim(), defaultChatId: tgChat.trim() });
      const me = await verifyTelegram();
      setStatus(`${uz.connectedAs}: @${me.username || me.first_name || me.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 pointer-events-auto overflow-hidden">
      <div onClick={onClose} className="absolute inset-0 bg-white/60 backdrop-blur-xl" />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] p-8 md:p-10 border border-zinc-100">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-300 hover:text-zinc-600 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="mb-6">
          <h2 className="text-3xl font-black text-darkDelegation tracking-tight mb-2">
            {uz.integrationsTitle}
          </h2>
          <p className="text-zinc-400 text-sm font-medium leading-relaxed">
            {uz.integrationsHint}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl text-[11px] text-red-600 font-medium">
            {error}
          </div>
        )}
        {status && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-[11px] text-emerald-700 font-medium flex items-center gap-2">
            <CheckCircle2 size={14} />
            {status}
          </div>
        )}

        <section className="mb-8">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-3">
            {uz.instagramSection}
          </h3>
          <label className="block text-[10px] font-bold text-zinc-400 mb-1 ml-1">{uz.igAccessToken}</label>
          <input
            type="password"
            value={igToken}
            onChange={(e) => setIgToken(e.target.value)}
            className="w-full mb-3 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm font-mono"
            placeholder="IGQV..."
            autoComplete="off"
          />
          <label className="block text-[10px] font-bold text-zinc-400 mb-1 ml-1">{uz.igUsername}</label>
          <input
            type="text"
            value={igUsername}
            onChange={(e) => setIgUsername(e.target.value)}
            className="w-full mb-1 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm font-mono"
            placeholder="mybrand"
          />
          <p className="text-[10px] text-zinc-400 mb-3 ml-1">{uz.igUsernameHint}</p>
          {instagram.accountName && instagram.igUserId && (
            <p className="text-[11px] text-zinc-400 mb-2">
              {uz.connectedAs}: @{instagram.accountName}
            </p>
          )}
          <button
            type="button"
            onClick={testIg}
            disabled={busy !== null || !igToken.trim() || (!igUsername.trim() && !/^IG/i.test(igToken.trim()))}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-darkDelegation disabled:opacity-40 cursor-pointer"
          >
            {busy === 'ig' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            {uz.testConnection}
          </button>
        </section>

        <section className="mb-8">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-3">
            {uz.telegramSection}
          </h3>
          <label className="block text-[10px] font-bold text-zinc-400 mb-1 ml-1">{uz.tgBotToken}</label>
          <input
            type="password"
            value={tgToken}
            onChange={(e) => setTgToken(e.target.value)}
            className="w-full mb-3 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm font-mono"
            autoComplete="off"
          />
          <label className="block text-[10px] font-bold text-zinc-400 mb-1 ml-1">{uz.tgChatId}</label>
          <input
            type="text"
            value={tgChat}
            onChange={(e) => setTgChat(e.target.value)}
            className="w-full mb-3 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm font-mono"
            placeholder="-100..."
          />
          {telegram.chatTitle && (
            <p className="text-[11px] text-zinc-400 mb-2">{uz.connectedAs}: {telegram.chatTitle}</p>
          )}
          <button
            type="button"
            onClick={testTg}
            disabled={busy !== null || !tgToken.trim()}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-darkDelegation disabled:opacity-40 cursor-pointer"
          >
            {busy === 'tg' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            {uz.testConnection}
          </button>
        </section>

        <section className="mb-8">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-3">
            {uz.autoPostSection}
          </h3>
          <label className="flex items-center gap-2 text-sm text-zinc-600 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPost.enabled}
              onChange={(e) => setAutoPost({ enabled: e.target.checked })}
            />
            {uz.autoPostEnabled}
          </label>
          <div className="flex gap-3 mb-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-400 mb-1">{uz.autoPostHour}</label>
              <input
                type="number"
                min={0}
                max={23}
                value={autoPost.hourLocal}
                onChange={(e) => setAutoPost({ hourLocal: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-400 mb-1">{uz.autoPostMode}</label>
              <select
                value={autoPost.contentMode}
                onChange={(e) => setAutoPost({ contentMode: e.target.value as 'image' | 'caption' })}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2 text-sm"
              >
                <option value="image">{uz.autoPostImage}</option>
                <option value="caption">{uz.autoPostCaption}</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-amber-600/80 leading-relaxed">{uz.autoPostLimit}</p>
        </section>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              clearSecrets();
              setIgToken('');
              setIgUsername('');
              setTgToken('');
              setTgChat('');
            }}
            className="text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-400 cursor-pointer"
          >
            {uz.clear}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={busy !== null}
            className="px-10 py-3.5 bg-darkDelegation text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] cursor-pointer disabled:opacity-40"
          >
            {busy === 'save' ? uz.importLoading : uz.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsModal;
