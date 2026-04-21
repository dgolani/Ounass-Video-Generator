// FieldFormatContext — carries the active project's per-field overrides
// down into the rendering scene so individual text elements can opt into
// overridden styling via useFieldFormat(path, baseValues).
//
// The Editor mounts a Provider around the Stage with the EditableState's
// `fieldFormatOverrides` map. Preview cards (gallery/dashboard) do NOT
// mount a Provider — they render at defaults, which is fine because
// per-project overrides are project-specific and the cards can't know
// which project's overrides to apply.

import { createContext, useContext, useMemo } from 'react';
import type { FieldFormat, FieldFormatOverrides } from '../store/fieldFormat';

export const FieldFormatContext = createContext<FieldFormatOverrides>({});

/** Baseline (designer-intent) values a scene passes in alongside the field
 *  path. The hook merges overrides onto these and returns a flat object the
 *  template can spread into its `style` prop.
 *
 *  Example:
 *    const style = useFieldFormat('kicker', {
 *      fontFamily: 'var(--font-body)',
 *      fontSize: wh(22),
 *      fontWeight: 700,
 *      color: colors.accent,
 *      letterSpacing: '0.5em',
 *      textTransform: 'uppercase',
 *    });
 *    <div style={{ ...style, position: 'absolute', top: h(220) }}>{kicker}</div>
 */
export type FieldBaseStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  color?: string;
  letterSpacing?: string;
  lineHeight?: number | string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  opacity?: number;
};

/** Resolved style after applying overrides — same shape as FieldBaseStyle
 *  but every key is definitely present except optional ones. Spread into
 *  the element's style prop. */
export type ResolvedFieldStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number | undefined;
  fontStyle: 'normal' | 'italic' | undefined;
  color: string | undefined;
  letterSpacing: string | undefined;
  lineHeight: number | string | undefined;
  textTransform:
    | 'none'
    | 'uppercase'
    | 'lowercase'
    | 'capitalize'
    | undefined;
  opacity: number | undefined;
};

/** Merge a per-field override onto the base style and return the final
 *  style object. */
export function applyFieldFormat(
  base: FieldBaseStyle,
  override: FieldFormat | undefined,
): ResolvedFieldStyle {
  if (!override) {
    return {
      fontFamily: base.fontFamily,
      fontSize: base.fontSize,
      fontWeight: base.fontWeight,
      fontStyle: base.fontStyle,
      color: base.color,
      letterSpacing: base.letterSpacing,
      lineHeight: base.lineHeight,
      textTransform: base.textTransform,
      opacity: base.opacity,
    };
  }

  // When marketer picks a family, we substitute it directly. The original
  // `base.fontFamily` often references a CSS variable (`var(--font-body)`) —
  // the override wins by providing a literal family name.
  const family = override.family
    ? override.family
    : base.fontFamily;

  // Size is multiplicative: template's base size × marketer scale.
  const size = override.sizeScale !== undefined
    ? base.fontSize * override.sizeScale
    : base.fontSize;

  // Opacity is multiplicative too — the template's animation may set
  // opacity; we cap it by the override (or leave base untouched).
  const opacity = override.opacity !== undefined
    ? (base.opacity ?? 1) * override.opacity
    : base.opacity;

  return {
    fontFamily: family,
    fontSize: size,
    fontWeight: override.weight ?? base.fontWeight,
    fontStyle:
      override.italic === undefined
        ? base.fontStyle
        : override.italic
          ? 'italic'
          : 'normal',
    color: override.color ?? base.color,
    letterSpacing: override.letterSpacing ?? base.letterSpacing,
    lineHeight: override.lineHeight ?? base.lineHeight,
    textTransform: override.textTransform ?? base.textTransform,
    opacity,
  };
}

/** React hook: resolve an override for `path` against `base` and return the
 *  final style. Memoises on the tuple of inputs so React.memo'd children
 *  don't repaint unless something actually changed. */
export function useFieldFormat(
  path: string,
  base: FieldBaseStyle,
): ResolvedFieldStyle {
  const overrides = useContext(FieldFormatContext);
  const override = overrides[path];
  return useMemo(
    () => applyFieldFormat(base, override),
    [
      base.fontFamily,
      base.fontSize,
      base.fontWeight,
      base.fontStyle,
      base.color,
      base.letterSpacing,
      base.lineHeight,
      base.textTransform,
      base.opacity,
      override,
    ],
  );
}
