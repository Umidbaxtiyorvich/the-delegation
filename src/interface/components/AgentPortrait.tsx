import React, { useMemo } from 'react';
import { generateAvatar, AvatarSubject } from '../../core/avatar/generateAvatar';
import { AvatarConfig, FaceType } from '../../core/avatar/types';
import { DOPPI_COLORS, DOPPI_ORNAMENT_COLORS } from '../../core/avatar/palettes';

/**
 * Per-agent portrait, drawn from the agent's AvatarConfig.
 *
 * Every feature — skin, hair shape and colour, doppi, garment fabric, beard —
 * comes from the config, so two agents never share a portrait. This replaces
 * the three hand-drawn SVGs that previously served the whole roster.
 */

interface AgentPortraitProps {
  /** Anything with an id; the appearance is derived from it. */
  subject: AvatarSubject;
  size?: number;
  className?: string;
  /** Draws the tinted backdrop. Off for inline use next to text. */
  showBackground?: boolean;
}

/** Skull proportions per face shape, in viewBox units. */
const FACE_SHAPES: Record<FaceType, { rx: number; ry: number; jaw: number }> = {
  oval: { rx: 20, ry: 25.5, jaw: 0.72 },
  round: { rx: 22, ry: 22.5, jaw: 0.86 },
  square: { rx: 21.5, ry: 24, jaw: 0.95 },
  long: { rx: 18.5, ry: 27, jaw: 0.7 },
  angular: { rx: 20.5, ry: 25, jaw: 0.6 },
  heart: { rx: 21.5, ry: 24.5, jaw: 0.5 },
};

const HEAD_CX = 50;
const HEAD_CY = 45;

/** Darkens a hex colour by `amount` (0..1) for shading without extra assets. */
function shade(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  const shaded = channels.map((c) => Math.max(0, Math.min(255, Math.round(c * (1 - amount)))));
  return `#${shaded.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function lighten(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  const lit = channels.map((c) => Math.round(c + (255 - c) * amount));
  return `#${lit.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Per-style hair metrics.
 *
 * `volume` is how far the hair rises above the skull, `hairline` is how far down
 * the forehead it reaches (as a fraction of the skull height — smaller means a
 * higher hairline and more visible forehead), and `backLength` is how far the
 * mass behind the head falls, 0 for styles with none.
 */
const HAIR_METRICS: Record<AvatarConfig['hairStyle'], { volume: number; hairline: number; backLength: number }> = {
  buzz_cut: { volume: 0, hairline: 0.42, backLength: 0 },
  receding: { volume: 1, hairline: 0.16, backLength: 0 },
  short_black: { volume: 2, hairline: 0.4, backLength: 0 },
  classic_uzbek: { volume: 2, hairline: 0.44, backLength: 0 },
  side_part: { volume: 3, hairline: 0.38, backLength: 0 },
  modern_quiff: { volume: 7, hairline: 0.34, backLength: 0 },
  tied_bun: { volume: 3, hairline: 0.42, backLength: 0.2 },
  braided: { volume: 3, hairline: 0.44, backLength: 0.95 },
  shoulder_length: { volume: 3, hairline: 0.45, backLength: 1.0 },
  long_wavy: { volume: 4, hairline: 0.46, backLength: 1.5 },
  long_straight: { volume: 3, hairline: 0.46, backLength: 1.65 },
};

/**
 * Hair covering the scalp. Drawn for every style — without it, long-haired
 * agents showed a bald crown, because the flowing mass sits behind the head.
 */
function scalpPath(config: AvatarConfig, rx: number, ry: number): string {
  const { volume, hairline } = HAIR_METRICS[config.hairStyle];
  const top = HEAD_CY - ry;
  const left = HEAD_CX - rx - 1;
  const right = HEAD_CX + rx + 1;
  const earY = HEAD_CY - ry * 0.05 + 3;
  const hairlineY = top + ry * hairline;

  // A side part sweeps the volume to one side instead of cresting centrally.
  const crestX = config.hairStyle === 'side_part' ? HEAD_CX + rx * 0.3 : HEAD_CX;

  return `M ${left} ${earY}
          Q ${left} ${top - volume} ${crestX} ${top - volume}
          Q ${right} ${top - volume} ${right} ${earY}
          Q ${HEAD_CX + rx * 0.55} ${hairlineY} ${HEAD_CX} ${hairlineY}
          Q ${HEAD_CX - rx * 0.55} ${hairlineY} ${left} ${earY} Z`;
}

/** The mass of hair falling behind and beside the head, or null for short cuts. */
function backHairPath(config: AvatarConfig, rx: number, ry: number): string | null {
  const { backLength } = HAIR_METRICS[config.hairStyle];
  if (backLength === 0) return null;

  const top = HEAD_CY - ry;
  // Wider than the skull so the hair frames the face from the front.
  const spread = backLength > 1 ? 5 : 3.5;
  const left = HEAD_CX - rx - spread;
  const right = HEAD_CX + rx + spread;
  const bottom = HEAD_CY + ry * backLength;

  return `M ${left} ${bottom}
          Q ${left - 1} ${top - 3} ${HEAD_CX} ${top - 4}
          Q ${right + 1} ${top - 3} ${right} ${bottom}
          Q ${HEAD_CX} ${bottom - ry * 0.25} ${left} ${bottom} Z`;
}

/** Facial hair shape, or null when clean shaven. */
function beardPath(config: AvatarConfig, rx: number, ry: number): string | null {
  const chinY = HEAD_CY + ry;

  switch (config.beardStyle) {
    case 'clean_shaven':
      return null;
    case 'mustache':
      return `M ${HEAD_CX - rx * 0.3} ${HEAD_CY + ry * 0.42} Q ${HEAD_CX} ${HEAD_CY + ry * 0.32} ${HEAD_CX + rx * 0.3} ${HEAD_CY + ry * 0.42} Q ${HEAD_CX} ${HEAD_CY + ry * 0.54} ${HEAD_CX - rx * 0.3} ${HEAD_CY + ry * 0.42} Z`;
    case 'light_stubble':
    case 'short_beard':
      return `M ${HEAD_CX - rx * 0.82} ${HEAD_CY + ry * 0.25} Q ${HEAD_CX} ${chinY + 1} ${HEAD_CX + rx * 0.82} ${HEAD_CY + ry * 0.25} Q ${HEAD_CX} ${HEAD_CY + ry * 0.62} ${HEAD_CX - rx * 0.82} ${HEAD_CY + ry * 0.25} Z`;
    case 'medium_beard':
      return `M ${HEAD_CX - rx * 0.92} ${HEAD_CY} Q ${HEAD_CX} ${chinY + 5} ${HEAD_CX + rx * 0.92} ${HEAD_CY} Q ${HEAD_CX} ${HEAD_CY + ry * 0.5} ${HEAD_CX - rx * 0.92} ${HEAD_CY} Z`;
  }
}

export const AgentPortrait: React.FC<AgentPortraitProps> = ({
  subject,
  size = 48,
  className = '',
  showBackground = true,
}) => {
  const config = useMemo(() => generateAvatar(subject), [
    subject.id,
    subject.avatarSeed,
    subject.color,
    subject.name,
    subject.description,
    // Overrides are a nested object; compare by value so edits re-render.
    JSON.stringify(subject.avatar ?? {}),
  ]);

  // Ids must be unique per rendered portrait or SVG defs collide across cards.
  const uid = useMemo(
    () => `ap-${config.seed.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).slice(2, 7)}`,
    [config.seed]
  );

  const shape = FACE_SHAPES[config.faceType];
  const { rx, ry, jaw } = shape;

  const skinShadow = shade(config.skinTone, 0.16);
  const hairShade = shade(config.hairColor, 0.25);
  const clothShade = shade(config.clothingColor, 0.2);

  const doppiColor = config.doppiStyle ? DOPPI_COLORS[config.doppiStyle] : '#14161A';
  const doppiOrnament = config.doppiStyle ? DOPPI_ORNAMENT_COLORS[config.doppiStyle] : '#F5F2EA';

  const eyeY = HEAD_CY - ry * 0.05;
  const eyeDx = rx * 0.42;
  const beard = beardPath(config, rx, ry);

  const scalp = scalpPath(config, rx, ry);
  const backHair = backHairPath(config, rx, ry);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={`${subject.name ?? 'Agent'} avatari`}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lighten(config.primaryColor, 0.72)} />
          <stop offset="100%" stopColor={lighten(config.primaryColor, 0.45)} />
        </linearGradient>

        <linearGradient id={`${uid}-skin`} x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={lighten(config.skinTone, 0.12)} />
          <stop offset="65%" stopColor={config.skinTone} />
          <stop offset="100%" stopColor={skinShadow} />
        </linearGradient>

        <linearGradient id={`${uid}-hair`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={lighten(config.hairColor, 0.22)} />
          <stop offset="70%" stopColor={config.hairColor} />
          <stop offset="100%" stopColor={hairShade} />
        </linearGradient>

        <linearGradient id={`${uid}-cloth`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={lighten(config.clothingColor, 0.1)} />
          <stop offset="100%" stopColor={clothShade} />
        </linearGradient>

        {/* Traditional textiles, drawn as tiling patterns over the garment. */}
        {config.fabricPattern === 'atlas' && (
          <pattern id={`${uid}-fabric`} width="14" height="10" patternUnits="userSpaceOnUse">
            <rect width="14" height="10" fill={config.clothingColor} />
            <path
              d="M -2 3 Q 3.5 0 7 3 Q 10.5 6 16 3"
              stroke={config.accentColor}
              strokeWidth="3"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M -2 8 Q 3.5 5 7 8 Q 10.5 11 16 8"
              stroke={lighten(config.accentColor, 0.3)}
              strokeWidth="1.4"
              fill="none"
              opacity="0.7"
            />
          </pattern>
        )}
        {config.fabricPattern === 'adras' && (
          <pattern id={`${uid}-fabric`} width="9" height="9" patternUnits="userSpaceOnUse">
            <rect width="9" height="9" fill={config.clothingColor} />
            <rect x="2" width="2.2" height="9" fill={config.accentColor} opacity="0.8" />
            <rect x="6" width="1" height="9" fill={lighten(config.accentColor, 0.35)} opacity="0.6" />
          </pattern>
        )}
        {config.fabricPattern === 'ornament' && (
          <pattern id={`${uid}-fabric`} width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill={config.clothingColor} />
            <path d="M 5 1.6 L 8.4 5 L 5 8.4 L 1.6 5 Z" fill={config.accentColor} opacity="0.75" />
          </pattern>
        )}

        <clipPath id={`${uid}-frame`}>
          <rect width="100" height="100" rx="26" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-frame)`}>
        {showBackground && <rect width="100" height="100" fill={`url(#${uid}-bg)`} />}

        {/* Behind the head, so it reads as hair falling past the shoulders. */}
        {backHair && <path d={backHair} fill={shade(config.hairColor, 0.12)} />}

        {/* Shoulders and garment */}
        <path
          d={`M 12 100 Q 14 ${HEAD_CY + ry + 12} ${HEAD_CX - rx * 0.75} ${HEAD_CY + ry + 6}
              L ${HEAD_CX + rx * 0.75} ${HEAD_CY + ry + 6}
              Q 86 ${HEAD_CY + ry + 12} 88 100 Z`}
          fill={config.fabricPattern === 'none' ? `url(#${uid}-cloth)` : `url(#${uid}-fabric)`}
        />
        {/* Collar, so national dress reads as a garment rather than a block */}
        <path
          d={`M ${HEAD_CX - rx * 0.5} ${HEAD_CY + ry + 5} Q ${HEAD_CX} ${HEAD_CY + ry + 14} ${HEAD_CX + rx * 0.5} ${HEAD_CY + ry + 5}`}
          stroke={config.accentColor}
          strokeWidth="2.2"
          fill="none"
          opacity="0.9"
        />

        {/* Neck */}
        <path
          d={`M ${HEAD_CX - rx * 0.3} ${HEAD_CY + ry - 4} L ${HEAD_CX - rx * 0.34} ${HEAD_CY + ry + 7}
              L ${HEAD_CX + rx * 0.34} ${HEAD_CY + ry + 7} L ${HEAD_CX + rx * 0.3} ${HEAD_CY + ry - 4} Z`}
          fill={skinShadow}
        />

        {/* Head: ellipse skull with a jaw that narrows per face shape */}
        <path
          d={`M ${HEAD_CX - rx} ${HEAD_CY - ry * 0.15}
              A ${rx} ${ry} 0 0 1 ${HEAD_CX + rx} ${HEAD_CY - ry * 0.15}
              Q ${HEAD_CX + rx * jaw} ${HEAD_CY + ry} ${HEAD_CX} ${HEAD_CY + ry}
              Q ${HEAD_CX - rx * jaw} ${HEAD_CY + ry} ${HEAD_CX - rx} ${HEAD_CY - ry * 0.15} Z`}
          fill={`url(#${uid}-skin)`}
        />

        {/* Ears, tucked in slightly so they do not read as handles */}
        <ellipse cx={HEAD_CX - rx + 0.8} cy={eyeY + 3} rx={2.2} ry={3.4} fill={skinShadow} />
        <ellipse cx={HEAD_CX + rx - 0.8} cy={eyeY + 3} rx={2.2} ry={3.4} fill={skinShadow} />

        {/* Brows */}
        <path
          d={`M ${HEAD_CX - eyeDx - 4} ${eyeY - 5.5} Q ${HEAD_CX - eyeDx} ${eyeY - 8} ${HEAD_CX - eyeDx + 4} ${eyeY - 5.5}`}
          stroke={hairShade}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M ${HEAD_CX + eyeDx - 4} ${eyeY - 5.5} Q ${HEAD_CX + eyeDx} ${eyeY - 8} ${HEAD_CX + eyeDx + 4} ${eyeY - 5.5}`}
          stroke={hairShade}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyes */}
        {[-1, 1].map((side) => (
          <g key={side}>
            <ellipse cx={HEAD_CX + side * eyeDx} cy={eyeY} rx={3.6} ry={2.6} fill="#FBFAF8" />
            <circle cx={HEAD_CX + side * eyeDx} cy={eyeY} r={1.9} fill={config.eyeColor} />
            <circle cx={HEAD_CX + side * eyeDx} cy={eyeY} r={0.85} fill="#15100C" />
            <circle
              cx={HEAD_CX + side * eyeDx - 0.7}
              cy={eyeY - 0.9}
              r={0.45}
              fill="#FFFFFF"
              opacity="0.9"
            />
          </g>
        ))}

        {/* Nose */}
        <path
          d={`M ${HEAD_CX} ${eyeY + 3} Q ${HEAD_CX + 1.8} ${eyeY + 8} ${HEAD_CX - 1.2} ${eyeY + 8.6}`}
          stroke={skinShadow}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Mouth */}
        <path
          d={`M ${HEAD_CX - rx * 0.26} ${HEAD_CY + ry * 0.45} Q ${HEAD_CX} ${HEAD_CY + ry * 0.58} ${HEAD_CX + rx * 0.26} ${HEAD_CY + ry * 0.45}`}
          stroke={shade(config.skinTone, 0.45)}
          strokeWidth="1.7"
          strokeLinecap="round"
          fill="none"
        />

        {beard && (
          <path
            d={beard}
            fill={config.hairColor}
            opacity={config.beardStyle === 'light_stubble' ? 0.35 : 0.92}
          />
        )}

        <path d={scalp} fill={`url(#${uid}-hair)`} />

        {/* A gathered bun sits behind the crown. */}
        {config.hairStyle === 'tied_bun' && (
          <circle
            cx={HEAD_CX}
            cy={HEAD_CY - ry - 2}
            r={rx * 0.34}
            fill={shade(config.hairColor, 0.18)}
          />
        )}

        {/* A single braid falling over one shoulder. */}
        {config.hairStyle === 'braided' && (
          <g>
            <path
              d={`M ${HEAD_CX + rx * 0.9} ${HEAD_CY + ry * 0.5}
                  Q ${HEAD_CX + rx * 1.15} ${HEAD_CY + ry * 1.1} ${HEAD_CX + rx * 0.95} ${HEAD_CY + ry * 1.6}`}
              stroke={shade(config.hairColor, 0.1)}
              strokeWidth={rx * 0.34}
              strokeLinecap="round"
              fill="none"
            />
            {[0.7, 1.0, 1.3].map((t) => (
              <path
                key={t}
                d={`M ${HEAD_CX + rx * (0.9 + (t - 0.7) * 0.12) - rx * 0.17} ${HEAD_CY + ry * t}
                    l ${rx * 0.34} 0`}
                stroke={lighten(config.hairColor, 0.25)}
                strokeWidth="1"
                opacity="0.6"
              />
            ))}
          </g>
        )}

        {/* Doppi, seated on the crown above the hairline */}
        {config.wearsDoppi && (
          <g>
            <path
              d={`M ${HEAD_CX - rx - 1.5} ${HEAD_CY - ry * 0.42}
                  Q ${HEAD_CX} ${HEAD_CY - ry - 11} ${HEAD_CX + rx + 1.5} ${HEAD_CY - ry * 0.42} Z`}
              fill={doppiColor}
            />
            {/* Embroidered brim band */}
            <path
              d={`M ${HEAD_CX - rx - 1.5} ${HEAD_CY - ry * 0.42} L ${HEAD_CX + rx + 1.5} ${HEAD_CY - ry * 0.42}`}
              stroke={doppiOrnament}
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Almond motifs, the signature of a Chust doppi */}
            {[-0.55, 0, 0.55].map((offset) => (
              <path
                key={offset}
                d={`M ${HEAD_CX + offset * rx} ${HEAD_CY - ry * 0.62}
                    q 1.6 -2.4 0 -4.8 q -1.6 2.4 0 4.8 Z`}
                fill={doppiOrnament}
                opacity="0.95"
              />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
};
