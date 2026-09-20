import { Eye, EyeOff, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { useUiStore } from '../integration/store/uiStore';
import {
  DEFAULT_MODELS,
  DEFAULT_OPENAI_BASE_URL,
  PROVIDER_MODELS,
  defaultModelForProvider,
} from '../core/llm/constants';
import { normalizeLlmConfig } from '../core/llm/providers/createProvider';
import type { LLMProviderId } from '../core/llm/types';
import { uz } from '../i18n/uz';

interface BYOKModalProps {
  onClose: () => void;
}

const STORAGE_KEY = 'byok-config';

const BYOKModal: React.FC<BYOKModalProps> = ({ onClose }) => {
  const { llmConfig, setLlmConfig, byokError } = useUiStore();
  const keys = llmConfig.keys || { openai: llmConfig.apiKey || '', gemini: '', claude: '' };

  const [openaiKey, setOpenaiKey] = useState(keys.openai || '');
  const [geminiKey, setGeminiKey] = useState(keys.gemini || '');
  const [claudeKey, setClaudeKey] = useState(keys.claude || '');
  const [baseUrl, setBaseUrl] = useState(llmConfig.baseUrl || DEFAULT_OPENAI_BASE_URL);
  const [provider, setProvider] = useState<LLMProviderId>(llmConfig.provider || 'openai');
  const [model, setModel] = useState(llmConfig.model || DEFAULT_MODELS.text);
  const [showKey, setShowKey] = useState(false);
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);

  const handleSave = () => {
    const config = normalizeLlmConfig({
      apiKey: openaiKey.trim(),
      baseUrl: baseUrl.trim() || DEFAULT_OPENAI_BASE_URL,
      model: model.trim() || defaultModelForProvider(provider),
      embedModel: llmConfig.embedModel || DEFAULT_MODELS.embed,
      provider,
      keys: {
        openai: openaiKey.trim(),
        gemini: geminiKey.trim(),
        claude: claudeKey.trim(),
      },
    });
    setLlmConfig(config);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save BYOK config', e);
    }
    onClose();
  };

  const handleClear = () => {
    const emptyConfig = normalizeLlmConfig({
      apiKey: '',
      baseUrl: DEFAULT_OPENAI_BASE_URL,
      model: DEFAULT_MODELS.text,
      embedModel: DEFAULT_MODELS.embed,
      provider: 'openai',
      keys: { openai: '', gemini: '', claude: '' },
    });
    setOpenaiKey('');
    setGeminiKey('');
    setClaudeKey('');
    setLlmConfig(emptyConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyConfig));
    } catch (e) {
      console.error('Failed to clear BYOK config', e);
    }
  };

  // Warn if user accidentally pastes an Instagram token into an LLM key field.
  const igKeyWarning = [openaiKey, geminiKey, claudeKey].some((k) => /^IG[A-Za-z0-9]/i.test(k.trim()));
  const canSave = !!(openaiKey.trim() || geminiKey.trim() || claudeKey.trim()) && !igKeyWarning;

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

        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-black text-darkDelegation tracking-tight mb-2">
              {uz.llmKeysTitle}
            </h2>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-[320px]">
              {uz.keyHint}
            </p>
          </div>

          {byokError && (() => {
            const isLongError = byokError.length > 120;
            const displayError = isErrorExpanded || !isLongError ? byokError : byokError.slice(0, 110) + '...';
            return (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-500 mb-0.5">{uz.apiError}</p>
                  <p className="text-[11px] font-medium text-red-600 leading-tight break-words whitespace-pre-wrap">
                    {displayError}
                  </p>
                  {isLongError && (
                    <button
                      onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                      className="mt-1 text-[9px] font-black uppercase tracking-widest text-red-500 cursor-pointer"
                    >
                      {isErrorExpanded ? 'Kamroq' : 'Koʻproq'}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {igKeyWarning && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-[11px] font-bold text-amber-700">
                ⚠️ Instagram tokenini (IGAA…) LLM kalit maydoniga qoʻymang! Uni <b>Integratsiyalar</b> panelida kiriting.
              </p>
            </div>
          )}

          {([
            ['openai', uz.openaiKey, openaiKey, setOpenaiKey],
            ['gemini', uz.geminiKey, geminiKey, setGeminiKey],
            ['claude', uz.claudeKey, claudeKey, setClaudeKey],
          ] as const).map(([id, label, value, setter]) => (
            <div key={id} className="mb-4">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2 ml-1">
                {label}
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={uz.pasteKey}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-6 py-3.5 pr-14 text-sm text-darkDelegation font-mono placeholder:text-zinc-300 placeholder:font-sans focus:outline-none focus:border-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-200 hover:text-zinc-400 cursor-pointer"
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          ))}

          <div className="mb-4">
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2 ml-1">
              {uz.defaultProvider}
            </label>
            <select
              value={provider}
              onChange={(e) => {
                const next = e.target.value as LLMProviderId;
                setProvider(next);
                setModel(defaultModelForProvider(next));
              }}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-6 py-3 text-sm font-mono"
            >
              <option value="openai">openai</option>
              <option value="gemini">gemini</option>
              <option value="claude">claude</option>
            </select>
          </div>

          {provider === 'openai' && (
            <div className="mb-4">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2 ml-1">
                OpenAI Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-6 py-3 text-sm font-mono"
              />
            </div>
          )}

          <div className="mb-8">
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2 ml-1">
              {uz.defaultModel}
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-6 py-3 text-sm font-mono lowercase"
            >
              {PROVIDER_MODELS[provider].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleClear}
              className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-400 cursor-pointer"
            >
              <Trash2 size={16} />
              {uz.clear}
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-12 py-4 bg-darkDelegation text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] hover:bg-black disabled:opacity-30 cursor-pointer"
            >
              {uz.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BYOKModal;
