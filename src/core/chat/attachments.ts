import { unzipSync, strFromU8 } from 'fflate';
import type { AgentNode } from '../../data/agents';

export type AttachmentKind = 'image' | 'video' | 'audio' | 'zip' | 'folder' | 'text' | 'file';

export interface ChatAttachment {
  id: string;
  name: string;
  mime: string;
  kind: AttachmentKind;
  size: number;
  dataUrl?: string;
  text?: string;
  listing?: string[];
}

export interface ReturnedFile {
  filename: string;
  mime: string;
  dataUrl: string;
}

const MAX_BYTES = 12 * 1024 * 1024;
const TEXT_EXT = /\.(txt|md|json|csv|ts|tsx|js|jsx|py|html|css|xml|yml|yaml|toml|svg|log)$/i;

export function classifyFile(name: string, mime: string): AttachmentKind {
  const m = (mime || '').toLowerCase();
  const n = name.toLowerCase();
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(n)) return 'image';
  if (m.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(n)) return 'video';
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(n)) return 'audio';
  if (m.includes('zip') || n.endsWith('.zip')) return 'zip';
  if (m.startsWith('text/') || TEXT_EXT.test(n)) return 'text';
  return 'file';
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function fromFile(file: File, folderHint?: string): Promise<ChatAttachment> {
  const name = folderHint || file.name;
  const kind = folderHint ? 'folder' : classifyFile(file.name, file.type);
  const att: ChatAttachment = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    mime: file.type || 'application/octet-stream',
    kind,
    size: file.size,
  };

  if (file.size > MAX_BYTES) {
    att.text = `(fayl katta: ${(file.size / 1024 / 1024).toFixed(1)} MB — faqat nomi yuborildi)`;
    return att;
  }

  if (kind === 'zip' || file.name.toLowerCase().endsWith('.zip')) {
    try {
      const buf = new Uint8Array(await readAsArrayBuffer(file));
      const unzipped = unzipSync(buf);
      const listing = Object.keys(unzipped).slice(0, 80);
      att.listing = listing;
      att.kind = 'zip';
      const texts: string[] = [];
      for (const key of listing.slice(0, 20)) {
        if (TEXT_EXT.test(key) && unzipped[key].byteLength < 200_000) {
          texts.push(`--- ${key} ---\n${strFromU8(unzipped[key]).slice(0, 4000)}`);
        }
      }
      att.text = texts.join('\n\n').slice(0, 24000);
      att.dataUrl = await readAsDataUrl(file);
    } catch {
      att.text = 'ZIP ochilmadi.';
      att.dataUrl = await readAsDataUrl(file);
    }
    return att;
  }

  if (kind === 'image' || kind === 'video' || kind === 'audio') {
    att.dataUrl = await readAsDataUrl(file);
    return att;
  }

  if (kind === 'text' || kind === 'folder') {
    try {
      att.text = (await readAsText(file)).slice(0, 16000);
    } catch {
      att.dataUrl = await readAsDataUrl(file);
    }
    return att;
  }

  att.dataUrl = await readAsDataUrl(file);
  return att;
}

export async function filesToAttachments(files: FileList | File[]): Promise<ChatAttachment[]> {
  const list = Array.from(files).slice(0, 16);
  const out: ChatAttachment[] = [];
  const folderNames = new Set<string>();

  for (const file of list) {
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    if (rel && rel.includes('/')) {
      folderNames.add(rel.split('/')[0]);
      out.push(await fromFile(file, rel));
    } else {
      out.push(await fromFile(file));
    }
  }

  if (folderNames.size) {
    for (const att of out) {
      if (att.name.includes('/')) att.kind = 'folder';
    }
  }
  return out;
}

export function summarizeAttachments(attachments: ChatAttachment[]): string {
  if (!attachments.length) return '';
  const lines = attachments.map((a) => {
    const bits = [`- ${a.name} (${a.kind}, ${Math.round(a.size / 1024)} KB)`];
    if (a.listing?.length) bits.push(`  zip ichida: ${a.listing.slice(0, 20).join(', ')}`);
    if (a.text) bits.push(`  matn:\n${a.text.slice(0, 6000)}`);
    return bits.join('\n');
  });
  return `[BIRIKTIRILGAN FAYLLAR]\n${lines.join('\n')}`;
}

const KIND_HINTS: Record<AttachmentKind, string[]> = {
  image: ['visual', 'image', 'design', 'cinematographer', 'photo', 'artist', 'rasm'],
  video: ['video', 'film', 'cinematographer', 'visual', 'veo', 'motion'],
  audio: ['music', 'audio', 'sound', 'lyria', 'musiqa'],
  zip: ['coder', 'architect', 'typescript', 'python', 'backend', 'reviewer', 'repo'],
  folder: ['coder', 'architect', 'repo', 'typescript'],
  text: ['docs', 'writer', 'coder', 'analyst', 'planner', 'press'],
  file: ['coder', 'analyst', 'architect'],
};

export function pickAgentForJob(
  agents: AgentNode[],
  attachments: ChatAttachment[],
  commentary: string,
): AgentNode {
  const lead = agents.find((a) => a.index === 1) || agents[0];
  if (!agents.length) return lead;

  const hay = `${commentary} ${attachments.map((a) => `${a.kind} ${a.name}`).join(' ')}`.toLowerCase();
  const kinds = new Set(attachments.map((a) => a.kind));

  let best = lead;
  let bestScore = -1;
  for (const agent of agents) {
    const blob = `${agent.id} ${agent.name} ${agent.description}`.toLowerCase();
    let score = 0;
    for (const kind of kinds) {
      for (const hint of KIND_HINTS[kind]) {
        if (blob.includes(hint)) score += 3;
        if (hay.includes(hint) && blob.includes(hint)) score += 2;
      }
    }
    if (hay.includes(agent.name.toLowerCase()) || hay.includes(agent.id.toLowerCase())) score += 6;
    if (score > bestScore) {
      bestScore = score;
      best = agent;
    }
  }
  return bestScore > 0 ? best : lead;
}

export function downloadReturnedFile(file: ReturnedFile) {
  const a = document.createElement('a');
  a.href = file.dataUrl;
  a.download = file.filename;
  a.click();
}

export function toReturnedFile(filename: string, mime: string, content: string, encoding: 'text' | 'base64'): ReturnedFile {
  if (encoding === 'base64') {
    const raw = content.includes(',') ? content : `data:${mime};base64,${content}`;
    return { filename, mime, dataUrl: raw.startsWith('data:') ? raw : `data:${mime};base64,${content}` };
  }
  const blob = new Blob([content], { type: mime || 'text/plain' });
  return { filename, mime: mime || 'text/plain', dataUrl: URL.createObjectURL(blob) };
}
