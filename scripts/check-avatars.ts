/**
 * Verification suite for the avatar generator.
 *
 * The generator's contract is that appearance is reproducible from a seed, so
 * these checks focus on determinism, per-agent diversity and the hard rules
 * (doppi is male-only, women are never bearded, heights stay in range).
 *
 * Run with: npm run check:avatars
 */

import {
  generateAvatar,
  pickBalancedGender,
  regenerateAvatar,
  type AvatarSubject,
} from '../src/core/avatar/generateAvatar';
import { ProceduralAvatarProvider, REFERENCE_HEIGHT_CM } from '../src/core/avatar/AvatarProvider';
import { HEIGHT_RANGE } from '../src/core/avatar/palettes';
import { hasEnoughContrast } from '../src/core/avatar/color';
import { HAIR_COVERAGE } from '../src/core/avatar/appearance';
import { getAllAgents } from '../src/data/agents';
import { AGENTIC_SETS } from '../src/data/agents';
import type { AvatarConfig } from '../src/core/avatar/types';

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean, detail = ''): void {
  checks++;
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

/** The real default roster, so the checks reflect what ships. */
const team = AGENTIC_SETS.find((set) => set.id === 'ikki-miya')!;
const roster: AvatarSubject[] = getAllAgents(team).map((agent) => ({
  id: agent.id,
  name: agent.name,
  description: agent.description,
  color: agent.color,
  avatarSeed: agent.avatarSeed,
  avatar: agent.avatar,
}));

// ── 1. Determinism ──────────────────────────────────────────────────────────
section('1. Determinizm');

for (const subject of roster) {
  const a = generateAvatar(subject);
  const b = generateAvatar(subject);
  check(
    `${subject.id} ikki marta bir xil`,
    JSON.stringify(a) === JSON.stringify(b)
  );
}

check(
  'boshqa id → boshqa avatar',
  JSON.stringify(generateAvatar({ id: 'jarvis' })) !==
    JSON.stringify(generateAvatar({ id: 'marketing-agent' }))
);

// ── 2. Diversity ────────────────────────────────────────────────────────────
section('2. Xilma-xillik (haqiqiy jamoa)');

const configs: AvatarConfig[] = roster.map(generateAvatar);

const signature = (c: AvatarConfig) =>
  [c.gender, c.ageGroup, c.faceType, c.skinTone, c.hairStyle, c.hairColor, c.clothingColor].join('|');

const uniqueSignatures = new Set(configs.map(signature));
check(
  `har bir agent farqli (${uniqueSignatures.size}/${configs.length})`,
  uniqueSignatures.size === configs.length
);

for (const field of ['faceType', 'skinTone', 'hairStyle', 'clothingColor', 'personality'] as const) {
  const distinct = new Set(configs.map((c) => c[field])).size;
  check(`${field}: ${distinct} xil qiymat`, distinct >= 2, `hammasi bir xil: ${configs[0][field]}`);
}

// ── 3. Gender distribution ──────────────────────────────────────────────────
section('3. Gender taqsimoti');

const males = configs.filter((c) => c.gender === 'male').length;
const maleShare = males / configs.length;
console.log(`  erkak: ${males}/${configs.length} (${Math.round(maleShare * 100)}%)`);
check('jamoada ikki jins ham bor', males > 0 && males < configs.length);
check(
  `standart jamoa 40–60% oralig'ida (${Math.round(maleShare * 100)}%)`,
  maleShare >= 0.4 && maleShare <= 0.6
);

// Over a large population the raw per-seed draw must sit near 50/50.
const bulk = Array.from({ length: 400 }, (_, i) => generateAvatar({ id: `bulk-agent-${i}` }));
const bulkMaleShare = bulk.filter((c) => c.gender === 'male').length / bulk.length;
check(
  `400 agentda 40–60% oralig'ida (${Math.round(bulkMaleShare * 100)}%)`,
  bulkMaleShare >= 0.4 && bulkMaleShare <= 0.6
);

// Balanced assignment must actively correct a skewed roster.
const skewed = Array.from({ length: 5 }, (_, i) => generateAvatar({ id: `m${i}`, avatar: { gender: 'male' } }));
check('nomutanosib jamoaga ayol tanlanadi', pickBalancedGender(skewed, 'newcomer') === 'female');

// ── 4. Hard rules ───────────────────────────────────────────────────────────
section('4. Qat\'iy qoidalar');

check('ayollarda do\'ppi yo\'q', bulk.every((c) => c.gender !== 'female' || !c.wearsDoppi));
check('ayollarda soqol yo\'q', bulk.every((c) => c.gender !== 'female' || c.beardStyle === 'clean_shaven'));
check(
  'do\'ppi bo\'lsa uslubi ham bor',
  bulk.every((c) => (c.wearsDoppi ? Boolean(c.doppiStyle) : c.doppiStyle === undefined))
);

const maleDoppiShare =
  bulk.filter((c) => c.gender === 'male' && c.wearsDoppi).length /
  bulk.filter((c) => c.gender === 'male').length;
check(
  `erkaklarning katta qismi do'ppili (${Math.round(maleDoppiShare * 100)}%)`,
  maleDoppiShare > 0.6
);

// Skin and clothing touch directly on this mesh, so a low-contrast pair reads
// as an unclothed agent.
const lowContrast = bulk.filter((c) => !hasEnoughContrast(c.clothingColor, c.skinTone));
check(
  `kiyim teri rangidan farq qiladi (${bulk.length - lowContrast.length}/${bulk.length})`,
  lowContrast.length === 0,
  lowContrast.length ? `masalan ${lowContrast[0].clothingColor} vs ${lowContrast[0].skinTone}` : ''
);

check(
  'bo\'y jinsga mos oraliqda',
  bulk.every((c) => c.height >= HEIGHT_RANGE[c.gender].min && c.height <= HEIGHT_RANGE[c.gender].max)
);

check(
  'ayollarda erkak sochi yo\'q',
  bulk.every((c) =>
    c.gender === 'female'
      ? ['long_straight', 'shoulder_length', 'tied_bun', 'braided', 'long_wavy'].includes(c.hairStyle)
      : ['short_black', 'side_part', 'buzz_cut', 'modern_quiff', 'classic_uzbek', 'receding'].includes(
          c.hairStyle
        )
  )
);

// The shader needs a coverage value for every style, otherwise hair vanishes.
check(
  'har bir soch uslubi uchun qoplama qiymati bor',
  bulk.every((c) => typeof HAIR_COVERAGE[c.hairStyle] === 'number')
);
check(
  'ayollarning sochi erkaklardan uzunroq',
  Math.min(...bulk.filter((c) => c.gender === 'female').map((c) => HAIR_COVERAGE[c.hairStyle])) >=
    Math.max(...bulk.filter((c) => c.gender === 'male').map((c) => HAIR_COVERAGE[c.hairStyle]))
);

check(
  'business/casual kiyimda milliy naqsh yo\'q atlas/adras sifatida',
  bulk.every((c) =>
    c.clothingStyle === 'business' || c.clothingStyle === 'casual'
      ? c.fabricPattern === 'none' || c.fabricPattern === 'ornament'
      : true
  )
);

const nationalPatterned = bulk.filter(
  (c) => c.clothingStyle === 'uzbek_national' && c.fabricPattern !== 'none'
).length;
const nationalTotal = bulk.filter((c) => c.clothingStyle === 'uzbek_national').length;
check(
  `milliy libosda deyarli har doim naqsh bor (${nationalPatterned}/${nationalTotal})`,
  nationalTotal === 0 || nationalPatterned / nationalTotal > 0.9
);

// ── 5. Overrides ────────────────────────────────────────────────────────────
section('5. Qo\'lda belgilash (override)');

const forcedFemale = generateAvatar({ id: 'ikki-ceo', avatar: { gender: 'female' } });
check('gender override ishlaydi', forcedFemale.gender === 'female');
check('override qilingan ayolda do\'ppi yo\'q', !forcedFemale.wearsDoppi);

const forced = generateAvatar({
  id: 'ikki-ceo',
  avatar: { gender: 'male', ageGroup: 'senior', clothingStyle: 'uzbek_national', wearsDoppi: true, doppiStyle: 'white' },
});
check('bir nechta override birga ishlaydi',
  forced.ageGroup === 'senior' && forced.clothingStyle === 'uzbek_national' && forced.doppiStyle === 'white');

check(
  'qolgan maydonlar hamon deterministik',
  generateAvatar({ id: 'ikki-ceo', avatar: { gender: 'male' } }).skinTone ===
    generateAvatar({ id: 'ikki-ceo', avatar: { gender: 'male' } }).skinTone
);

// ── 6. Regeneration ─────────────────────────────────────────────────────────
section('6. Qayta generatsiya');

const base: AvatarSubject = { id: 'ikki-ceo', name: 'Bosh direktor', description: 'boshqaradi' };
const before = generateAvatar(base);

const regen1 = regenerateAvatar(base);
const after1 = generateAvatar({ ...base, ...regen1 });
check('yangi seed beriladi', regen1.avatarSeed !== before.seed);
check('ko\'rinish o\'zgaradi', signature(after1) !== signature(before));

const regen2 = regenerateAvatar({ ...base, ...regen1 });
check('ketma-ket bosishda seed o\'sadi', regen2.avatarSeed !== regen1.avatarSeed);

const kept = regenerateAvatar(base, { keepIdentity: true });
const afterKept = generateAvatar({ ...base, ...kept });
check(
  'Keep Identity: gender saqlanadi',
  afterKept.gender === before.gender && afterKept.personality === before.personality
);
check(
  'Keep Identity: tashqi ko\'rinish yangilanadi',
  afterKept.skinTone !== before.skinTone ||
    afterKept.hairStyle !== before.hairStyle ||
    afterKept.clothingColor !== before.clothingColor
);

const stableAfterRegen = generateAvatar({ ...base, ...regen1 });
check('qayta ochilganda o\'zgarmaydi', signature(stableAfterRegen) === signature(after1));

// ── 7. Provider ─────────────────────────────────────────────────────────────
section('7. AvatarProvider');

const provider = new ProceduralAvatarProvider();

(async () => {
  const resolved = await provider.loadAvatar(base);
  check('provider avatar qaytaradi', resolved.kind === 'procedural' && resolved.config.seed === base.id);
  check(
    'instance parametrlari to\'ldirilgan',
    resolved.instance.skinColor === resolved.config.skinTone &&
      resolved.instance.scale > 0.8 &&
      resolved.instance.scale < 1.15
  );
  check(
    'do\'ppi accessory sifatida uzatiladi',
    (await provider.loadAvatar({ id: 'x', avatar: { gender: 'male', wearsDoppi: true } })).instance
      .accessory === 'doppi'
  );

  const cached = await provider.loadAvatar(base);
  check('kesh bir xil obyekt qaytaradi', cached === resolved);

  provider.invalidate(base.id);
  check('invalidate keshni tozalaydi', (await provider.loadAvatar(base)) !== resolved);

  check(
    'referens bo\'y scale = 1.0',
    Math.abs(
      (await provider.loadAvatar({ id: 'ref', avatar: { height: REFERENCE_HEIGHT_CM } })).instance.scale - 1
    ) < 1e-9
  );

  console.log(`\n${failures === 0 ? 'HAMMASI O\'TDI' : 'XATOLIK BOR'}: ${checks - failures}/${checks}`);
  process.exit(failures === 0 ? 0 : 1);
})();
