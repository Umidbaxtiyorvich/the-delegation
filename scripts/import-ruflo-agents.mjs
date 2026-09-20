import fs from 'fs';
import path from 'path';

const root = path.resolve('../ruflo/.claude/agents');

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

function title(id) {
  return id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const files = walk(root);
const seen = new Map();

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  const fm = m[1];
  const name = (fm.match(/^name:\s*(.+)$/m) || [])[1];
  let desc = '';
  const lines = fm.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('description:')) {
      if (lines[i].includes('|')) {
        const parts = [];
        for (let j = i + 1; j < lines.length; j++) {
          if (/^[a-zA-Z][a-zA-Z0-9_-]*:/.test(lines[j])) break;
          const s = lines[j].trim();
          if (s) parts.push(s);
        }
        desc = parts.join(' ');
      } else {
        desc = lines[i].replace(/^description:\s*/, '').trim();
      }
      break;
    }
  }
  if (!name) continue;
  const id = name.trim();
  if (!seen.has(id)) {
    seen.set(id, {
      id,
      name: title(id),
      description: (desc || title(id)).slice(0, 320),
    });
  }
}

const arr = [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
const json = JSON.stringify(arr, null, 2);
const out = `/**
 * Ruflo agent catalog imported from ruvnet/ruflo .claude/agents.
 * Queen + specialists start on the Ruflo Swarm team; hire_agent can spawn the rest.
 */
export interface RufloAgentDef {
  id: string;
  name: string;
  description: string;
}

export const RUFLO_AGENTS: RufloAgentDef[] = ${json};

export function findRufloAgent(query: string): RufloAgentDef | undefined {
  const q = (query || '').trim().toLowerCase().replace(/\\s+/g, '-');
  if (!q) return undefined;
  const exact = RUFLO_AGENTS.find(
    (a) => a.id === q || a.name.toLowerCase() === query.trim().toLowerCase(),
  );
  if (exact) return exact;
  return RUFLO_AGENTS.find(
    (a) => a.id.includes(q) || a.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
}
`;

fs.writeFileSync(path.resolve('src/data/rufloAgents.ts'), out);
console.log('wrote', arr.length, 'agents');
