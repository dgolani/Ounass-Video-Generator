import type { CSSProperties } from 'react';
import { clamp, Easing, type EaseFn } from './math';
import { useSprite } from './timeline';

type TextSpriteProps = {
  text: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  font?: string;
  weight?: number;
  entryDur?: number;
  exitDur?: number;
  entryEase?: EaseFn;
  exitEase?: EaseFn;
  align?: 'left' | 'center' | 'right';
  letterSpacing?: string;
};

export function TextSprite({
  text,
  x = 0,
  y = 0,
  size = 48,
  color = '#111',
  font = 'Inter, system-ui, sans-serif',
  weight = 600,
  entryDur = 0.45,
  exitDur = 0.35,
  entryEase = Easing.easeOutBack,
  exitEase = Easing.easeInCubic,
  align = 'left',
  letterSpacing = '-0.01em',
}: TextSpriteProps) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let ty = 0;

  if (localTime < entryDur) {
    const t = entryEase(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    ty = (1 - t) * 16;
  } else if (localTime > exitStart) {
    const t = exitEase(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    ty = -t * 8;
  }

  const translateX =
    align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${translateX}, ${ty}px)`,
        opacity,
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing,
        whiteSpace: 'pre',
        lineHeight: 1.1,
        willChange: 'transform, opacity',
      }}
    >
      {text}
    </div>
  );
}

type ImageSpriteProps = {
  src?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  entryDur?: number;
  exitDur?: number;
  kenBurns?: boolean;
  kenBurnsScale?: number;
  radius?: number;
  fit?: CSSProperties['objectFit'];
  placeholder?: { label?: string } | null;
};

export function ImageSprite({
  src,
  x = 0,
  y = 0,
  width = 400,
  height = 300,
  entryDur = 0.6,
  exitDur = 0.4,
  kenBurns = false,
  kenBurnsScale = 1.08,
  radius = 12,
  fit = 'cover',
  placeholder = null,
}: ImageSpriteProps) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutCubic(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    scale = 0.96 + 0.04 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = (kenBurns ? kenBurnsScale : 1) + 0.02 * t;
  } else if (kenBurns) {
    const holdSpan = exitStart - entryDur;
    const holdT = holdSpan > 0 ? (localTime - entryDur) / holdSpan : 0;
    scale = 1 + (kenBurnsScale - 1) * holdT;
  }

  const content = placeholder ? (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'repeating-linear-gradient(135deg, #e9e6df 0 10px, #dcd8cf 10px 20px)',
        color: '#6b6458',
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 13,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {placeholder.label || 'image'}
    </div>
  ) : (
    <img
      src={src}
      alt=""
      style={{
        width: '100%',
        height: '100%',
        objectFit: fit,
        display: 'block',
      }}
    />
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        borderRadius: radius,
        overflow: 'hidden',
        willChange: 'transform, opacity',
      }}
    >
      {content}
    </div>
  );
}

type RectSpriteProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  radius?: number;
  entryDur?: number;
  exitDur?: number;
};

export function RectSprite({
  x = 0,
  y = 0,
  width = 100,
  height = 100,
  color = '#111',
  radius = 8,
  entryDur = 0.4,
  exitDur = 0.3,
}: RectSpriteProps) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutBack(clamp(localTime / entryDur, 0, 1));
    opacity = clamp(localTime / entryDur, 0, 1);
    scale = 0.4 + 0.6 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInQuad(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = 1 - 0.15 * t;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        background: color,
        borderRadius: radius,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        willChange: 'transform, opacity',
      }}
    />
  );
}
