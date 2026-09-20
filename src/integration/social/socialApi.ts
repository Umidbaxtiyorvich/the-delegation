import { useIntegrationsStore, type SocialMediaItem } from '../store/integrationsStore';

/** IGAA/IGQ… = Instagram Login token → graph.instagram.com; EAA… = Facebook Graph. */
function igApiHost(token: string): 'instagram' | 'facebook' {
  return /^IG/i.test(token.trim()) ? 'instagram' : 'facebook';
}

function formatIgError(data: any, status: number): string {
  const err = data?.error;
  if (!err) return `Instagram API ${status}`;
  const parts = [err.message, err.error_user_msg, err.error_user_title].filter(Boolean);
  const base = parts.join(' — ') || `Instagram API ${status}`;
  if (err.code === 190) {
    return `${base}. Token muddati tugagan yoki notoʻgʻri — Meta Developer da yangi token oling.`;
  }
  if (err.code === 100 && /username/i.test(String(err.message))) {
    return `${base}. Username token bilan bog‘langan hisob bilan mos kelishi kerak.`;
  }
  return base;
}

async function igFetch(path: string, init: RequestInit = {}): Promise<any> {
  const { accessToken } = useIntegrationsStore.getState().instagram;
  if (!accessToken) throw new Error('Instagram access token yoʻq — Integratsiyalar panelidan kiriting');

  const headers = new Headers(init.headers || {});
  headers.set('x-ig-token', accessToken);
  headers.set('x-ig-host', igApiHost(accessToken));

  const res = await fetch(`/api/ig/${path.replace(/^\//, '')}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(formatIgError(data, res.status));
  }
  return data;
}

function igQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function tgFetch(method: string, body?: Record<string, unknown>): Promise<any> {
  const { botToken } = useIntegrationsStore.getState().telegram;
  if (!botToken) throw new Error('Telegram bot token yoʻq — Integratsiyalar panelidan kiriting');

  const res = await fetch(`/api/tg/${method}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tg-token': botToken,
    },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data?.description || data?.error || `Telegram API ${res.status}`);
  }
  return data;
}

function normalizeIgUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

/** Resolve @username → numeric igUserId via Graph API (token must have page/IG access). */
async function resolveInstagramAccount(usernameInput: string): Promise<{
  id: string;
  username: string;
  name?: string;
}> {
  const want = normalizeIgUsername(usernameInput);
  const { accessToken } = useIntegrationsStore.getState().instagram;
  const isIgLogin = igApiHost(accessToken) === 'instagram';

  // Instagram Login token (IGAA…): graph.instagram.com/me
  if (isIgLogin) {
    const me = await igFetch('me?fields=user_id,username,name,account_type');
    const id = String(me.user_id || me.id || '');
    if (!id) throw new Error('Instagram hisob ID topilmadi');
    const actual = (me.username || '').toLowerCase();
    if (want && actual && actual !== want) {
      throw new Error(
        `Token @${me.username} hisobiga tegishli. Siz @${want} yozdingiz — to‘g‘ri username kiriting yoki bo‘sh qoldiring.`,
      );
    }
    return { id, username: me.username || want || actual, name: me.name };
  }

  if (!want) throw new Error('Instagram username kerak (masalan: mybrand)');

  // Backward compat: numeric id pasted instead of username
  if (/^\d+$/.test(usernameInput.trim())) {
    const me = await igFetch(`${usernameInput.trim()}?fields=id,username,name`);
    return { id: me.id, username: me.username || want, name: me.name };
  }

  // Instagram User token: /me
  try {
    const me = await igFetch('me?fields=id,username,name');
    if (me?.id) {
      const u = (me.username || '').toLowerCase();
      if (!u || u === want) {
        return { id: me.id, username: me.username || want, name: me.name };
      }
    }
  } catch {
    /* try pages */
  }

  // Facebook Page → instagram_business_account
  const pages = await igFetch('me/accounts?fields=instagram_business_account{id,username,name}');
  const accounts: Array<{ id: string; username?: string; name?: string }> = [];
  for (const page of pages.data || []) {
    const ig = page.instagram_business_account;
    if (ig?.id) accounts.push(ig);
  }

  if (!accounts.length) {
    throw new Error(
      'Token bilan bog‘langan Instagram Business hisob topilmadi. Facebook Page va IG Business ulangan bo‘lishi kerak.',
    );
  }

  const match = accounts.find((a) => (a.username || '').toLowerCase() === want);
  if (match) {
    return { id: match.id, username: match.username || want, name: match.name };
  }

  if (accounts.length === 1) {
    const only = accounts[0];
    return { id: only.id, username: only.username || want, name: only.name };
  }

  const list = accounts.map((a) => `@${a.username || a.id}`).join(', ');
  throw new Error(`@${want} topilmadi. Token bilan bog‘langan hisoblar: ${list}`);
}

async function ensureIgUserId(): Promise<string> {
  const { igUserId, username, accountName } = useIntegrationsStore.getState().instagram;
  if (igUserId) return igUserId;
  const handle = username || accountName || '';
  if (!handle) throw new Error('Instagram username kerak — Integratsiyalar panelidan kiriting');
  const resolved = await resolveInstagramAccount(handle);
  useIntegrationsStore.getState().setInstagram({
    igUserId: resolved.id,
    username: resolved.username,
    accountName: resolved.username,
  });
  return resolved.id;
}

export async function verifyInstagram(username?: string): Promise<{ id: string; name?: string; username?: string }> {
  const { username: saved, accountName } = useIntegrationsStore.getState().instagram;
  const input = username || saved || accountName || '';
  const resolved = await resolveInstagramAccount(input);
  useIntegrationsStore.getState().setInstagram({
    username: resolved.username,
    igUserId: resolved.id,
    accountName: resolved.username,
  });
  return { id: resolved.id, name: resolved.name, username: resolved.username };
}

export async function verifyTelegram(): Promise<{ id: number; username?: string; first_name?: string }> {
  const data = await tgFetch('getMe');
  const result = data.result;
  const { defaultChatId } = useIntegrationsStore.getState().telegram;
  if (defaultChatId) {
    try {
      const chat = await tgFetch('getChat', { chat_id: defaultChatId });
      useIntegrationsStore.getState().setTelegram({
        chatTitle: chat.result?.title || chat.result?.username || String(defaultChatId),
      });
    } catch {
      /* chat optional at verify time */
    }
  }
  return result;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function instagramPublishPhoto(args: {
  caption: string;
  imageUrl?: string;
}): Promise<{ id: string }> {
  const igUserId = await ensureIgUserId();
  if (!args.imageUrl?.startsWith('http')) {
    throw new Error('Instagram uchun ochiq image URL kerak (http/https). Base64 qoʻllab-quvvatlanmaydi.');
  }

  const container = await igFetch(
    `${igUserId}/media${igQuery({
      image_url: args.imageUrl,
      caption: args.caption || '',
    })}`,
    { method: 'POST' },
  );

  // Wait briefly for container readiness on some accounts
  await sleep(2000);

  const published = await igFetch(
    `${igUserId}/media_publish${igQuery({ creation_id: container.id })}`,
    { method: 'POST' },
  );

  await refreshRecentMedia().catch(() => undefined);
  return { id: published.id };
}

export async function instagramPublishReel(args: {
  caption: string;
  videoUrl: string;
}): Promise<{ id: string }> {
  const igUserId = await ensureIgUserId();
  if (!args.videoUrl?.startsWith('http')) {
    throw new Error('Reel uchun ochiq video URL kerak');
  }

  const container = await igFetch(
    `${igUserId}/media${igQuery({
      media_type: 'REELS',
      video_url: args.videoUrl,
      caption: args.caption || '',
    })}`,
    { method: 'POST' },
  );

  // Poll until FINISHED (max ~2 min)
  for (let i = 0; i < 24; i++) {
    await sleep(5000);
    const status = await igFetch(`${container.id}?fields=status_code`);
    if (status.status_code === 'FINISHED') break;
    if (status.status_code === 'ERROR') throw new Error('Reel container ERROR');
    if (i === 23) throw new Error('Reel tayyorlanishi juda uzoq davom etdi');
  }

  const published = await igFetch(
    `${igUserId}/media_publish${igQuery({ creation_id: container.id })}`,
    { method: 'POST' },
  );

  await refreshRecentMedia().catch(() => undefined);
  return { id: published.id };
}

export async function refreshRecentMedia(): Promise<SocialMediaItem[]> {
  const igUserId = await ensureIgUserId();

  const data = await igFetch(
    `${igUserId}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=8`,
  );
  const items: SocialMediaItem[] = (data.data || []).map((m: any) => ({
    id: m.id,
    caption: m.caption,
    timestamp: m.timestamp,
    permalink: m.permalink,
    likeCount: m.like_count,
    commentsCount: m.comments_count,
    mediaType: m.media_type,
  }));
  useIntegrationsStore.getState().setRecentMedia(items);
  return items;
}

export async function instagramInsights(): Promise<string> {
  const media = await refreshRecentMedia();
  if (!media.length) {
    const summary = 'Oxirgi media topilmadi.';
    useIntegrationsStore.getState().setLastInsightsSummary(summary);
    return summary;
  }

  const lines: string[] = [];
  for (const m of media.slice(0, 5)) {
    let insightBits = `likes=${m.likeCount ?? '?'} comments=${m.commentsCount ?? '?'}`;
    try {
      const insights = await igFetch(
        `${m.id}/insights?metric=impressions,reach,engagement,saved`,
      );
      const parts = (insights.data || []).map(
        (row: any) => `${row.name}=${row.values?.[0]?.value ?? '?'}`,
      );
      if (parts.length) insightBits = parts.join(', ');
    } catch {
      /* some media types lack insights */
    }
    const cap = (m.caption || '').slice(0, 80).replace(/\n/g, ' ');
    lines.push(`• ${m.id} (${m.mediaType || '?'}) ${insightBits} | ${cap}`);
  }

  const summary = lines.join('\n');
  useIntegrationsStore.getState().setLastInsightsSummary(summary);
  return summary;
}

export async function telegramSendMessage(args: {
  text: string;
  chatId?: string;
}): Promise<{ message_id: number }> {
  const chatId = args.chatId || useIntegrationsStore.getState().telegram.defaultChatId;
  if (!chatId) throw new Error('Telegram chat_id yoʻq');
  const data = await tgFetch('sendMessage', { chat_id: chatId, text: args.text });
  return { message_id: data.result.message_id };
}

export async function telegramSendPhoto(args: {
  photoUrl: string;
  caption?: string;
  chatId?: string;
}): Promise<{ message_id: number }> {
  const chatId = args.chatId || useIntegrationsStore.getState().telegram.defaultChatId;
  if (!chatId) throw new Error('Telegram chat_id yoʻq');
  if (!args.photoUrl?.startsWith('http')) throw new Error('Telegram photo uchun URL kerak');
  const data = await tgFetch('sendPhoto', {
    chat_id: chatId,
    photo: args.photoUrl,
    caption: args.caption || '',
  });
  return { message_id: data.result.message_id };
}

export async function telegramGetChat(chatId?: string): Promise<string> {
  const id = chatId || useIntegrationsStore.getState().telegram.defaultChatId;
  if (!id) throw new Error('Telegram chat_id yoʻq');
  const data = await tgFetch('getChat', { chat_id: id });
  const c = data.result;
  useIntegrationsStore.getState().setTelegram({
    chatTitle: c.title || c.username || String(id),
  });
  return JSON.stringify({
    id: c.id,
    type: c.type,
    title: c.title,
    username: c.username,
    description: c.description,
  });
}
