import { RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import React, { useMemo } from 'react';
import { AgentNode } from '../../data/agents';
import { generateAvatar, regenerateAvatar } from '../../core/avatar/generateAvatar';
import { AvatarOverrides } from '../../core/avatar/types';
import {
  BEARD_STYLES,
  BODY_TYPES,
  DOPPI_STYLES,
  EYE_COLORS,
  FACE_TYPES,
  FEMALE_HAIR_STYLES,
  HAIR_COLORS_DARK,
  HAIR_COLORS_GREY,
  HAIR_COLORS_GREYING,
  MALE_HAIR_STYLES,
  SKIN_TONES,
} from '../../core/avatar/palettes';
import { AgentPortrait } from '../components/AgentPortrait';

/**
 * Appearance controls for a single agent.
 *
 * Nothing here is stored as a finished picture: the panel only writes an
 * `avatarSeed` and a sparse `avatar` override map onto the agent, and the
 * portrait is regenerated from those two fields wherever it is displayed.
 */

interface AvatarEditorProps {
  agent: AgentNode;
  onChange: (changes: Pick<AgentNode, 'avatarSeed' | 'avatar'>) => void;
  readOnly?: boolean;
}

const GENDER_LABELS = { male: 'Erkak', female: 'Ayol' } as const;

const AGE_LABELS = {
  young: 'Yosh',
  adult: 'Katta',
  middle_aged: "O'rta yosh",
  senior: 'Keksa',
} as const;

const CLOTHING_LABELS = {
  uzbek_national: 'Milliy libos',
  modern_uzbek: 'Zamonaviy milliy',
  traditional: "An'anaviy",
  business: 'Ish uslubi',
  casual: 'Kundalik',
} as const;

const FABRIC_LABELS = {
  atlas: 'Xon-atlas',
  adras: 'Adras',
  ornament: 'Naqsh',
  none: 'Tekis',
} as const;

const HAIR_LABELS: Record<string, string> = {
  short_black: 'Qisqa qora',
  side_part: 'Yon taram',
  buzz_cut: 'Juda qisqa',
  modern_quiff: 'Zamonaviy tepa',
  classic_uzbek: 'Klassik',
  receding: 'Peshona ochiq',
  long_straight: "Uzun to'g'ri",
  shoulder_length: 'Yelkagacha',
  tied_bun: 'Tugun',
  braided: "O'rilgan",
  long_wavy: 'Uzun to‘lqinli',
};

const BEARD_LABELS: Record<string, string> = {
  clean_shaven: 'Soqolsiz',
  light_stubble: 'Yengil',
  short_beard: 'Qisqa soqol',
  medium_beard: "O'rta soqol",
  mustache: 'Mo‘ylov',
};

const DOPPI_LABELS: Record<string, string> = {
  black_chust: 'Chust (qora)',
  white: 'Oq',
  patterned_green: 'Yashil naqshli',
  patterned_gold: 'Tilla naqshli',
  modern_black: 'Zamonaviy qora',
};

const FACE_LABELS: Record<string, string> = {
  oval: 'Cho‘ziq-oval',
  round: 'Yumaloq',
  square: 'To‘rtburchak',
  long: 'Uzun',
  angular: 'Qirrali',
  heart: 'Yurak',
};

const BODY_LABELS: Record<string, string> = {
  slim: 'Nozik',
  average: "O'rtacha",
  athletic: 'Sportchi',
  sturdy: 'Baquvvat',
  heavy: "To'la",
};

const ALL_HAIR_COLORS = [...HAIR_COLORS_DARK, ...HAIR_COLORS_GREYING, ...HAIR_COLORS_GREY];

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 shrink-0">
      {label}
    </span>
    {children}
  </div>
);

/** Small swatch strip; clearer than a colour name for skin, hair and eyes. */
const Swatches: React.FC<{
  colors: readonly string[];
  value: string;
  onPick: (color: string) => void;
  disabled?: boolean;
}> = ({ colors, value, onPick, disabled }) => (
  <div className="flex flex-wrap gap-1 justify-end">
    {colors.map((color) => (
      <button
        key={color}
        type="button"
        disabled={disabled}
        onClick={() => onPick(color)}
        title={color}
        className={`w-5 h-5 rounded-full border transition-transform ${
          color.toLowerCase() === value.toLowerCase()
            ? 'border-darkDelegation scale-110 ring-2 ring-black/10'
            : 'border-zinc-200 hover:scale-110'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        style={{ backgroundColor: color }}
      />
    ))}
  </div>
);

const selectClass =
  'px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-black/5 cursor-pointer max-w-[150px] truncate';

export const AvatarEditor: React.FC<AvatarEditorProps> = ({ agent, onChange, readOnly = false }) => {
  const config = useMemo(() => generateAvatar(agent), [agent]);

  const overrides = agent.avatar ?? {};
  const hasOverrides = Object.keys(overrides).length > 0 || !!agent.avatarSeed;

  /** Pins a single trait. Everything unpinned still follows the seed. */
  const pin = <K extends keyof AvatarOverrides>(key: K, value: AvatarOverrides[K]) => {
    onChange({ avatarSeed: agent.avatarSeed, avatar: { ...overrides, [key]: value } });
  };

  const handleRegenerate = (keepIdentity: boolean) => {
    const next = regenerateAvatar(agent, { keepIdentity });
    // Manual picks are intentionally dropped: a regeneration means "surprise me".
    onChange(next);
  };

  const handleReset = () => onChange({ avatarSeed: undefined, avatar: undefined });

  const hairStyles = config.gender === 'male' ? MALE_HAIR_STYLES : FEMALE_HAIR_STYLES;

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center gap-4 p-3 bg-zinc-50 border border-zinc-100 rounded-2xl">
        <AgentPortrait subject={agent} size={72} className="shrink-0 rounded-2xl" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-black text-darkDelegation">
            {GENDER_LABELS[config.gender]} · {AGE_LABELS[config.ageGroup]}
          </p>
          <p className="text-[10px] text-zinc-500 font-medium">
            {config.height} sm · {BODY_LABELS[config.bodyType]}
          </p>
          <p className="text-[10px] text-zinc-500 font-medium">
            {CLOTHING_LABELS[config.clothingStyle]} · {FABRIC_LABELS[config.fabricPattern]}
          </p>
          {!hasOverrides && (
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
              Avtomatik (ID asosida)
            </p>
          )}
        </div>
      </div>

      {!readOnly && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleRegenerate(false)}
              className="flex-1 py-2 bg-darkDelegation hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <RefreshCw size={12} strokeWidth={3} />
              Yangilash
            </button>
            <button
              type="button"
              onClick={() => handleRegenerate(true)}
              title="Jinsi va xarakteri saqlanadi, tashqi ko'rinishi yangilanadi"
              className="flex-1 py-2 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Sparkles size={12} strokeWidth={3} />
              Shaxsni saqla
            </button>
          </div>

          <div className="space-y-2.5">
            <Row label="Jins">
              <select
                value={config.gender}
                onChange={(e) => pin('gender', e.target.value as 'male' | 'female')}
                className={selectClass}
              >
                {(['male', 'female'] as const).map((g) => (
                  <option key={g} value={g}>
                    {GENDER_LABELS[g]}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Yosh">
              <select
                value={config.ageGroup}
                onChange={(e) => pin('ageGroup', e.target.value as keyof typeof AGE_LABELS)}
                className={selectClass}
              >
                {(Object.keys(AGE_LABELS) as (keyof typeof AGE_LABELS)[]).map((a) => (
                  <option key={a} value={a}>
                    {AGE_LABELS[a]}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Yuz shakli">
              <select
                value={config.faceType}
                onChange={(e) => pin('faceType', e.target.value as any)}
                className={selectClass}
              >
                {FACE_TYPES.map((f) => (
                  <option key={f} value={f}>
                    {FACE_LABELS[f]}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Soch turi">
              <select
                value={config.hairStyle}
                onChange={(e) => pin('hairStyle', e.target.value as any)}
                className={selectClass}
              >
                {hairStyles.map((h) => (
                  <option key={h} value={h}>
                    {HAIR_LABELS[h]}
                  </option>
                ))}
              </select>
            </Row>

            {config.gender === 'male' && (
              <>
                <Row label="Soqol">
                  <select
                    value={config.beardStyle}
                    onChange={(e) => pin('beardStyle', e.target.value as any)}
                    className={selectClass}
                  >
                    {BEARD_STYLES.map((b) => (
                      <option key={b} value={b}>
                        {BEARD_LABELS[b]}
                      </option>
                    ))}
                  </select>
                </Row>

                <Row label="Do'ppi">
                  <select
                    value={config.wearsDoppi ? config.doppiStyle ?? 'black_chust' : 'none'}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'none') {
                        onChange({
                          avatarSeed: agent.avatarSeed,
                          avatar: { ...overrides, wearsDoppi: false, doppiStyle: undefined },
                        });
                      } else {
                        onChange({
                          avatarSeed: agent.avatarSeed,
                          avatar: { ...overrides, wearsDoppi: true, doppiStyle: value as any },
                        });
                      }
                    }}
                    className={selectClass}
                  >
                    <option value="none">Yo'q</option>
                    {DOPPI_STYLES.map((d) => (
                      <option key={d} value={d}>
                        {DOPPI_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </Row>
              </>
            )}

            <Row label="Kiyim">
              <select
                value={config.clothingStyle}
                onChange={(e) => pin('clothingStyle', e.target.value as any)}
                className={selectClass}
              >
                {(Object.keys(CLOTHING_LABELS) as (keyof typeof CLOTHING_LABELS)[]).map((c) => (
                  <option key={c} value={c}>
                    {CLOTHING_LABELS[c]}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Mato naqshi">
              <select
                value={config.fabricPattern}
                onChange={(e) => pin('fabricPattern', e.target.value as any)}
                className={selectClass}
              >
                {(Object.keys(FABRIC_LABELS) as (keyof typeof FABRIC_LABELS)[]).map((f) => (
                  <option key={f} value={f}>
                    {FABRIC_LABELS[f]}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Tana">
              <select
                value={config.bodyType}
                onChange={(e) => pin('bodyType', e.target.value as any)}
                className={selectClass}
              >
                {BODY_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {BODY_LABELS[b]}
                  </option>
                ))}
              </select>
            </Row>

            <div className="space-y-1.5 pt-1">
              <Row label="Teri rangi">
                <Swatches
                  colors={SKIN_TONES}
                  value={config.skinTone}
                  onPick={(c) => pin('skinTone', c)}
                />
              </Row>
              <Row label="Soch rangi">
                <Swatches
                  colors={ALL_HAIR_COLORS}
                  value={config.hairColor}
                  onPick={(c) => pin('hairColor', c)}
                />
              </Row>
              <Row label="Ko'z rangi">
                <Swatches
                  colors={EYE_COLORS}
                  value={config.eyeColor}
                  onPick={(c) => pin('eyeColor', c)}
                />
              </Row>
            </div>
          </div>

          {hasOverrides && (
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2 text-zinc-500 hover:bg-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw size={12} strokeWidth={3} />
              Avtomatik holatga qaytarish
            </button>
          )}
        </>
      )}
    </div>
  );
};
