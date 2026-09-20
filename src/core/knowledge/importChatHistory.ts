/**
 * Parse ChatGPT data-export into team knowledge, brief, and CEO chat.
 *
 * Supports official OpenAI export layouts:
 * - classic: conversations.json
 * - sharded (2025+): conversations-000.json, conversations-001.json, …
 * - ZIP containing those files plus user.json / chat.html / etc.
 */

import { unzipSync } from 'fflate';
import type { LLMMessage } from '../llm/types';

const INSIGHT_MAX_CHARS = 8_000;
const CEO_HISTORY_LIMIT = 20;
const BRIEF_USER_SNIPPET = 280;

export interface ChatTurn {
  role: 'user' | 'assistant' | 'system' | 'tool';
  text: string;
  createTime?: number;
}

export interface ParsedConversation {
  id: string;
  title: string;
  createTime: number;
  updateTime: number;
  messages: ChatTurn[];
}

export interface KnowledgeDraft {
  topic: string;
  insight: string;
  tags: string[];
  authorIndex: number;
  authorName: string;
  assignedAgentIndexes?: number[];
}

export interface ImportSelectionResult {
  insights: KnowledgeDraft[];
  brief: string;
  ceoHistory: LLMMessage[];
}

type MappingNode = {
  id?: string;
  parent?: string | null;
  children?: string[];
  message?: {
    id?: string;
    author?: { role?: string };
    create_time?: number | null;
    content?: {
      content_type?: string;
      parts?: unknown[];
    } | null;
  } | null;
};

type RawConversation = {
  id?: string;
  conversation_id?: string;
  title?: string | null;
  create_time?: number;
  update_time?: number;
  current_node?: string | null;
  mapping?: Record<string, MappingNode>;
};

function partToText(part: unknown): string {
  if (typeof part === 'string') return part;
  if (part && typeof part === 'object') {
    const obj = part as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.content === 'string') return obj.content;
  }
  return '';
}

function extractText(content: { content_type?: string; parts?: unknown[] } | null | undefined): string {
  if (!content || typeof content !== 'object') return '';
  const parts = content.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map(partToText).filter(Boolean).join('\n').trim();
}

function nodeToTurn(node: MappingNode | undefined): ChatTurn | null {
  const msg = node?.message;
  if (!msg?.author?.role) return null;
  const role = msg.author.role;
  if (role !== 'user' && role !== 'assistant' && role !== 'system' && role !== 'tool') return null;
  const text = extractText(msg.content ?? undefined);
  if (!text) return null;
  return {
    role,
    text,
    createTime: typeof msg.create_time === 'number' ? msg.create_time : undefined,
  };
}

/** Prefer active branch via current_node → parent (handles regenerate forks). */
function linearizeMapping(
  mapping: Record<string, MappingNode>,
  currentNode?: string | null,
): ChatTurn[] {
  const keys = Object.keys(mapping);
  if (!keys.length) return [];

  for (const key of keys) {
    if (!mapping[key].id) mapping[key] = { ...mapping[key], id: key };
  }

  const chainIds: string[] = [];
  if (currentNode && mapping[currentNode]) {
    let cursor: string | null | undefined = currentNode;
    const seen = new Set<string>();
    while (cursor && mapping[cursor] && !seen.has(cursor)) {
      seen.add(cursor);
      chainIds.push(cursor);
      cursor = mapping[cursor].parent;
    }
    chainIds.reverse();
  } else {
    const rootKey =
      keys.find((k) => mapping[k].parent == null) ??
      keys.find((k) => !mapping[k].parent) ??
      keys[0];

    const visit = (id: string) => {
      const node = mapping[id];
      if (!node) return;
      chainIds.push(id);
      const kids = node.children ?? [];
      if (kids.length) visit(kids[kids.length - 1]);
    };
    visit(rootKey);
  }

  const turns: ChatTurn[] = [];
  for (const id of chainIds) {
    const turn = nodeToTurn(mapping[id]);
    if (turn) turns.push(turn);
  }
  return turns;
}

function parseConversation(raw: RawConversation, index: number): ParsedConversation | null {
  if (!raw?.mapping || typeof raw.mapping !== 'object') return null;
  const messages = linearizeMapping(raw.mapping, raw.current_node).filter(
    (m) => m.role === 'user' || m.role === 'assistant',
  );
  if (messages.length === 0) return null;

  const id = String(raw.id || raw.conversation_id || `conv_${index}`);
  const title = (raw.title || '').trim() || `Suhbat ${index + 1}`;
  return {
    id,
    title,
    createTime: typeof raw.create_time === 'number' ? raw.create_time : 0,
    updateTime: typeof raw.update_time === 'number' ? raw.update_time : 0,
    messages,
  };
}

function looksLikeConversation(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return !!obj.mapping && typeof obj.mapping === 'object';
}

function coerceConversationList(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['conversations', 'items', 'data', 'chats', 'threads']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    if (looksLikeConversation(obj)) return [obj];
  }
  return null;
}

export function parseConversationsJson(data: unknown): ParsedConversation[] {
  const list = coerceConversationList(data);
  if (!list) {
    throw new Error(
      "Suhbat JSON topilmadi. Export ichida conversations.json yoki conversations-000.json bo'lishi kerak.",
    );
  }

  const out: ParsedConversation[] = [];
  list.forEach((item, i) => {
    const parsed = parseConversation(item as RawConversation, i);
    if (parsed) out.push(parsed);
  });

  if (!out.length && list.length) {
    throw new Error(
      `${list.length} ta yozuv bor, lekin suhbat matni chiqmadi. Export formatini tekshiring.`,
    );
  }

  return out.sort((a, b) => (b.updateTime || b.createTime) - (a.updateTime || a.createTime));
}

function decodeUtf8(bytes: Uint8Array): string {
  let text = new TextDecoder('utf-8').decode(bytes);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
}

function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Bo'sh fayl");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("JSON o'qib bo'lmadi — ChatGPT export faylini tekshiring");
  }
}

function normalizeEntryPath(name: string): string {
  return name.replace(/\\/g, '/');
}

/** conversations.json or sharded conversations-000.json … */
function isConversationShardName(name: string): boolean {
  const base = normalizeEntryPath(name).split('/').pop()?.toLowerCase() ?? '';
  return base === 'conversations.json' || /^conversations-\d+\.json$/.test(base);
}

function mergeConversationArrays(parts: unknown[]): unknown[] {
  const merged: unknown[] = [];
  for (const part of parts) {
    const list = coerceConversationList(part);
    if (list) merged.push(...list);
  }
  return merged;
}

function pickConversationsFromZip(files: Record<string, Uint8Array>): unknown {
  const entries = Object.keys(files)
    .map(normalizeEntryPath)
    .filter((n) => n.toLowerCase().endsWith('.json') && !n.toLowerCase().includes('__macosx') && !n.endsWith('/'));

  if (!entries.length) {
    const names = Object.keys(files).map(normalizeEntryPath).slice(0, 16).join(', ') || "(bo'sh)";
    throw new Error(`ZIP ichida JSON yo'q. Topilgan: ${names}`);
  }

  // Prefer sharded / classic conversation files and merge them.
  const shardNames = entries
    .filter(isConversationShardName)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (shardNames.length) {
    const parts: unknown[] = [];
    const errors: string[] = [];
    for (const name of shardNames) {
      const key = Object.keys(files).find((k) => normalizeEntryPath(k) === name) ?? name;
      try {
        parts.push(tryParseJson(decodeUtf8(files[key])));
      } catch (err) {
        errors.push(`${name}: ${err instanceof Error ? err.message : 'xato'}`);
      }
    }
    const merged = mergeConversationArrays(parts);
    if (merged.length) return merged;
    throw new Error(
      `conversations-*.json o'qilmadi. ${errors[0] ?? 'Matnli suhbat yo\'q.'}`,
    );
  }

  // Fallback: score any JSON that looks like conversation arrays (skip user.json etc.)
  let best: { name: string; data: unknown; score: number } | null = null;
  for (const name of entries) {
    const base = name.split('/').pop()?.toLowerCase() ?? '';
    if (
      base === 'user.json' ||
      base === 'user_settings.json' ||
      base === 'ads.json' ||
      base === 'export_manifest.json' ||
      base === 'message_feedback.json' ||
      base === 'shared_conversations.json' ||
      base === 'library_files.json' ||
      base === 'conversation_asset_file_names.json'
    ) {
      continue;
    }

    const key = Object.keys(files).find((k) => normalizeEntryPath(k) === name) ?? name;
    try {
      const data = tryParseJson(decodeUtf8(files[key]));
      const list = coerceConversationList(data);
      if (!list?.length) continue;
      const withMapping = list.slice(0, 8).filter(looksLikeConversation).length;
      const score = withMapping * 30 + Math.min(list.length, 80);
      if (!best || score > best.score) best = { name, data: list, score };
    } catch {
      // skip unreadable
    }
  }

  if (!best) {
    throw new Error(
      `ZIP ichida conversations-000.json / conversations.json topilmadi (${entries.join(', ')}).`,
    );
  }
  return best.data;
}

/** Load ChatGPT export from .json, sharded json, or official ZIP. */
export async function loadConversationsFromFile(file: File): Promise<ParsedConversation[]> {
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  const isZip =
    name.endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    (bytes[0] === 0x50 && bytes[1] === 0x4b);

  let data: unknown;
  if (isZip) {
    let unzipped: Record<string, Uint8Array>;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error("ZIP ochilmadi — fayl buzilgan yoki parolli bo'lishi mumkin");
    }
    data = pickConversationsFromZip(unzipped);
  } else {
    data = tryParseJson(decodeUtf8(bytes));
  }

  return parseConversationsJson(data);
}

/** Load all conversation shards from an unzipped export folder (FileList). */
export async function loadConversationsFromFileList(fileList: FileList | File[]): Promise<ParsedConversation[]> {
  const files = Array.from(fileList as ArrayLike<File>);
  if (!files.length) throw new Error('Papka bo\'sh');

  const shards = files
    .filter((f) => {
      const base = (f.webkitRelativePath || f.name).replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? '';
      return base === 'conversations.json' || /^conversations-\d+\.json$/.test(base);
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  if (!shards.length) {
    const names = files
      .map((f) => (f.webkitRelativePath || f.name).split(/[/\\]/).pop())
      .filter(Boolean)
      .slice(0, 20)
      .join(', ');
    throw new Error(
      `Papkada conversations-000.json topilmadi. Ko'rinadigan fayllar: ${names || '(yo\'q)'}`,
    );
  }

  const parts: unknown[] = [];
  for (const file of shards) {
    const text = decodeUtf8(new Uint8Array(await file.arrayBuffer()));
    parts.push(tryParseJson(text));
  }
  return parseConversationsJson(mergeConversationArrays(parts));
}

function formatDialogue(messages: ChatTurn[], maxChars: number): string {
  const lines = messages.map((m) => {
    const who = m.role === 'user' ? 'User' : 'Assistant';
    return `${who}: ${m.text}`;
  });
  let body = lines.join('\n\n');
  if (body.length > maxChars) {
    body = '…\n\n' + body.slice(body.length - maxChars);
  }
  return body;
}

/** Compact insight for bulk folder imports (keeps title + last turns). */
export function conversationToCompactInsight(conv: ParsedConversation): KnowledgeDraft {
  const recent = conv.messages.slice(-4);
  return {
    topic: conv.title.slice(0, 120),
    insight: formatDialogue(recent, 1_200),
    tags: ['chatgpt', 'import'],
    authorIndex: 0,
    authorName: 'ChatGPT import',
  };
}

export function conversationToInsight(conv: ParsedConversation): KnowledgeDraft {
  return {
    topic: conv.title.slice(0, 120),
    insight: formatDialogue(conv.messages, INSIGHT_MAX_CHARS),
    tags: ['chatgpt', 'import'],
    authorIndex: 0,
    authorName: 'ChatGPT import',
  };
}

export interface AgentHint {
  index: number;
  name: string;
  description: string;
}

const ROLE_KEYWORDS: { match: RegExp; boost: string[] }[] = [
  { match: /product|mahsulot|mvp|user story|roadmap/i, boost: ['mahsulot', 'product', 'mvp'] },
  { match: /growth|marketing|instagram|reklama|sotuv|content|kontent|post/i, boost: ['growth', 'osish', 'marketing', 'kontent', 'content'] },
  { match: /tech|developer|kod|api|backend|frontend|dastur/i, boost: ['tech', 'texnika', 'developer', 'dastur', 'muhandis'] },
  { match: /finance|moliya|byudjet|buxgalter|narx|pul/i, boost: ['moliya', 'finance', 'buxgalter'] },
  { match: /analyst|tahlil|bozor|raqobatchi|tam|sam/i, boost: ['tahlil', 'analyst', 'bozor'] },
  { match: /ceo|direktor|strateg|brif|jamoa/i, boost: ['direktor', 'ceo', 'bosh'] },
];

/** Route each insight to matching agents; guarantee every agent gets some brain food. */
export function assignInsightsToAgents(
  drafts: KnowledgeDraft[],
  agents: AgentHint[],
): KnowledgeDraft[] {
  if (!agents.length) return drafts;
  const lead = agents[0];

  const result = drafts.map((draft) => {
    const hay = `${draft.topic}\n${draft.insight}`.toLowerCase();
    const scored = agents.map((agent) => {
      const blob = `${agent.name} ${agent.description}`.toLowerCase();
      let score = 0;
      for (const word of blob.split(/[^a-zA-Zа-яА-ЯёЁўқғҳʼ'\d]+/).filter((w) => w.length > 3)) {
        if (hay.includes(word.toLowerCase())) score += 1;
      }
      for (const rule of ROLE_KEYWORDS) {
        if (rule.match.test(hay) && rule.boost.some((b) => blob.includes(b.toLowerCase()))) {
          score += 4;
        }
      }
      return { index: agent.index, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const winners = scored.filter((s) => s.score > 0).slice(0, 3).map((s) => s.index);
    const assigned = winners.length ? winners : [lead.index];
    return { ...draft, assignedAgentIndexes: assigned };
  });

  // Ensure EVERY agent is assigned to at least a few insights (round-robin fill).
  const counts = new Map<number, number>(agents.map((a) => [a.index, 0]));
  for (const draft of result) {
    for (const idx of draft.assignedAgentIndexes || []) {
      counts.set(idx, (counts.get(idx) || 0) + 1);
    }
  }

  const minPerAgent = Math.max(3, Math.floor(result.length / Math.max(agents.length, 1)));
  let cursor = 0;
  for (const agent of agents) {
    let have = counts.get(agent.index) || 0;
    while (have < minPerAgent && result.length > 0) {
      const draft = result[cursor % result.length];
      cursor += 1;
      const set = new Set(draft.assignedAgentIndexes || []);
      if (!set.has(agent.index)) {
        set.add(agent.index);
        draft.assignedAgentIndexes = [...set];
        have += 1;
        counts.set(agent.index, have);
      }
      // Safety: avoid infinite loop on tiny sets
      if (cursor > result.length * (minPerAgent + 2)) break;
    }
  }

  return result;
}

export function buildBriefFromConversations(convs: ParsedConversation[]): string {
  if (convs.length === 0) return '';

  const lines: string[] = [
    `ChatGPT tarixidan avtomatik import: ${convs.length} ta suhbat.`,
    '',
    'Asosiy mavzular:',
  ];

  for (const conv of convs.slice(0, 24)) {
    const lastUser = [...conv.messages].reverse().find((m) => m.role === 'user');
    const snippet = lastUser
      ? lastUser.text.replace(/\s+/g, ' ').trim().slice(0, BRIEF_USER_SNIPPET)
      : '';
    lines.push(`- ${conv.title}${snippet ? ` — ${snippet}` : ''}`);
  }

  if (convs.length > 24) {
    lines.push(`… va yana ${convs.length - 24} ta suhbat bilim bazasida.`);
  }

  lines.push(
    '',
    'Jamoa: importlangan bilimlar va agent miyalaridagi taqsimotdan foydalanib ishlashni davom ettiring.',
  );
  return lines.join('\n');
}

export function buildCeoHistory(convs: ParsedConversation[]): LLMMessage[] {
  if (convs.length === 0) return [];

  const primary = [...convs].sort(
    (a, b) => (b.updateTime || b.createTime) - (a.updateTime || a.createTime),
  )[0];

  const recent = primary.messages.slice(-CEO_HISTORY_LIMIT);
  const history: LLMMessage[] = [
    {
      role: 'user',
      content: `[ChatGPT import] Suhbat: "${primary.title}". Quyida oldingi dialogning davomi.`,
      metadata: { internal: true, source: 'chatgpt_import' },
    },
  ];

  for (const turn of recent) {
    if (turn.role !== 'user' && turn.role !== 'assistant') continue;
    history.push({
      role: turn.role,
      content: turn.text,
      metadata: { source: 'chatgpt_import' },
    });
  }
  return history;
}

export function buildImportSelection(
  convs: ParsedConversation[],
  opts?: { compact?: boolean; agents?: AgentHint[] },
): ImportSelectionResult {
  const drafts = convs.map((c) =>
    opts?.compact ? conversationToCompactInsight(c) : conversationToInsight(c),
  );
  const insights = opts?.agents?.length ? assignInsightsToAgents(drafts, opts.agents) : drafts;
  return {
    insights,
    brief: buildBriefFromConversations(convs),
    ceoHistory: buildCeoHistory(convs),
  };
}
