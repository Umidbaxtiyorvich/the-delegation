import { create } from 'zustand';

export interface InstagramConfig {
  accessToken: string;
  /** User-facing @username — API calls resolve this to igUserId automatically. */
  username: string;
  /** Resolved Instagram Business account id (filled after verify/save). */
  igUserId: string;
  accountName?: string;
}

export interface TelegramConfig {
  botToken: string;
  defaultChatId: string;
  chatTitle?: string;
}

export interface AutoPostConfig {
  enabled: boolean;
  hourLocal: number;
  contentMode: 'image' | 'caption';
  lastPostedDate?: string;
}

export interface SocialMediaItem {
  id: string;
  caption?: string;
  timestamp?: string;
  permalink?: string;
  likeCount?: number;
  commentsCount?: number;
  mediaType?: string;
}

export interface IntegrationsConfig {
  instagram: InstagramConfig;
  telegram: TelegramConfig;
  autoPost: AutoPostConfig;
  recentMedia: SocialMediaItem[];
  lastInsightsSummary?: string;
}

interface IntegrationsState extends IntegrationsConfig {
  setInstagram: (partial: Partial<InstagramConfig>) => void;
  setTelegram: (partial: Partial<TelegramConfig>) => void;
  setAutoPost: (partial: Partial<AutoPostConfig>) => void;
  setRecentMedia: (items: SocialMediaItem[]) => void;
  setLastInsightsSummary: (summary: string) => void;
  markAutoPostedToday: () => void;
  clearSecrets: () => void;
}

const STORAGE_KEY = 'integrations-config';

const DEFAULTS: IntegrationsConfig = {
  instagram: { accessToken: '', username: '', igUserId: '', accountName: '' },
  telegram: { botToken: '', defaultChatId: '', chatTitle: '' },
  autoPost: { enabled: false, hourLocal: 10, contentMode: 'image' },
  recentMedia: [],
};

function loadConfig(): IntegrationsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS, instagram: { ...DEFAULTS.instagram }, telegram: { ...DEFAULTS.telegram }, autoPost: { ...DEFAULTS.autoPost } };
    const parsed = JSON.parse(raw);
    return {
      instagram: {
        ...DEFAULTS.instagram,
        ...(parsed.instagram || {}),
        // Migrate old saves that only had accountName / igUserId
        username:
          parsed.instagram?.username ||
          parsed.instagram?.accountName ||
          '',
      },
      telegram: { ...DEFAULTS.telegram, ...(parsed.telegram || {}) },
      autoPost: { ...DEFAULTS.autoPost, ...(parsed.autoPost || {}) },
      recentMedia: Array.isArray(parsed.recentMedia) ? parsed.recentMedia : [],
      lastInsightsSummary: parsed.lastInsightsSummary || '',
    };
  } catch {
    return { ...DEFAULTS, instagram: { ...DEFAULTS.instagram }, telegram: { ...DEFAULTS.telegram }, autoPost: { ...DEFAULTS.autoPost } };
  }
}

function persist(state: IntegrationsConfig) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        instagram: state.instagram,
        telegram: state.telegram,
        autoPost: state.autoPost,
        recentMedia: state.recentMedia,
        lastInsightsSummary: state.lastInsightsSummary,
      }),
    );
  } catch (e) {
    console.error('[integrationsStore] persist failed', e);
  }
}

const initial = loadConfig();

export const useIntegrationsStore = create<IntegrationsState>((set, get) => ({
  ...initial,

  setInstagram: (partial) => {
    set((s) => {
      const next = { ...s, instagram: { ...s.instagram, ...partial } };
      persist(next);
      return next;
    });
  },

  setTelegram: (partial) => {
    set((s) => {
      const next = { ...s, telegram: { ...s.telegram, ...partial } };
      persist(next);
      return next;
    });
  },

  setAutoPost: (partial) => {
    set((s) => {
      const next = { ...s, autoPost: { ...s.autoPost, ...partial } };
      persist(next);
      return next;
    });
  },

  setRecentMedia: (items) => {
    set((s) => {
      const next = { ...s, recentMedia: items };
      persist(next);
      return next;
    });
  },

  setLastInsightsSummary: (summary) => {
    set((s) => {
      const next = { ...s, lastInsightsSummary: summary };
      persist(next);
      return next;
    });
  },

  markAutoPostedToday: () => {
    const today = new Date().toISOString().slice(0, 10);
    get().setAutoPost({ lastPostedDate: today });
  },

  clearSecrets: () => {
    const next: IntegrationsConfig = {
      ...DEFAULTS,
      instagram: { ...DEFAULTS.instagram },
      telegram: { ...DEFAULTS.telegram },
      autoPost: { ...DEFAULTS.autoPost },
      recentMedia: [],
    };
    persist(next);
    set(next);
  },
}));
