// Per-field typography + style overrides, persisted with each project.
//
// Every marketer-editable text field in a template (declared via
// FieldDescriptor with `kind: 'text'`) can be individually formatted
// from the Properties panel's Format drawer. Overrides live on the
// project, so two ads made from the same template can have different
// per-field formatting without the brand kit changing.
//
// Everything is optional — `undefined` means "use the template's
// designer-intent style for this field". The per-field resolver merges
// overrides onto the template's base values, producing a final inline
// style object.

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export type FieldFormat = {
  /** Font family name. Must be one of the role's curated families (see
   *  CURATED_FAMILIES in engine/typography.ts). Enforced at UI level by
   *  the drawer's family dropdown; unknown values fall back to the role
   *  default at resolution time. */
  family?: string;
  /** Multiplier applied to the template's base fontSize. 1 = no change,
   *  0.5 = half, 2 = double. Keeps size scaling intact across aspects. */
  sizeScale?: number;
  /** 300 / 400 / 500 / 600 / 700 — pill row in the drawer. */
  weight?: number;
  /** Italic toggle. */
  italic?: boolean;
  /** CSS color string (hex, rgb, rgba, named). Drawer supplies a picker
   *  plus one-click brand-palette swatches. */
  color?: string;
  /** CSS letter-spacing value with units ('0.05em', '6px'). */
  letterSpacing?: string;
  /** Unitless line-height multiplier. */
  lineHeight?: number;
  /** CSS text-transform. */
  textTransform?: TextTransform;
  /** 0..1. Multiplies onto whatever opacity the template's animation
   *  computes — so animation fades still play, overridden opacity just
   *  caps them lower (or boosts to 1 if set explicitly). */
  opacity?: number;
};

/** Empty override — nothing changed from template default. */
export const EMPTY_FIELD_FORMAT: FieldFormat = {};

/** True if every field in the override is undefined (i.e. the marketer
 *  has reset it or never touched it). Used by the drawer to gate the
 *  "Reset" button state. */
export function isFieldFormatEmpty(fmt: FieldFormat | undefined): boolean {
  if (!fmt) return true;
  return (
    fmt.family === undefined &&
    fmt.sizeScale === undefined &&
    fmt.weight === undefined &&
    fmt.italic === undefined &&
    fmt.color === undefined &&
    fmt.letterSpacing === undefined &&
    fmt.lineHeight === undefined &&
    fmt.textTransform === undefined &&
    fmt.opacity === undefined
  );
}

/** Prune undefined keys so the persisted map stays compact. */
export function compactFieldFormat(fmt: FieldFormat): FieldFormat {
  const out: FieldFormat = {};
  if (fmt.family !== undefined) out.family = fmt.family;
  if (fmt.sizeScale !== undefined) out.sizeScale = fmt.sizeScale;
  if (fmt.weight !== undefined) out.weight = fmt.weight;
  if (fmt.italic !== undefined) out.italic = fmt.italic;
  if (fmt.color !== undefined) out.color = fmt.color;
  if (fmt.letterSpacing !== undefined) out.letterSpacing = fmt.letterSpacing;
  if (fmt.lineHeight !== undefined) out.lineHeight = fmt.lineHeight;
  if (fmt.textTransform !== undefined) out.textTransform = fmt.textTransform;
  if (fmt.opacity !== undefined) out.opacity = fmt.opacity;
  return out;
}

/** Whole-project map keyed by field path (matches FieldDescriptor.path).
 *  Example: { 'kicker': { weight: 700, italic: true }, 'hero.price': {…} } */
export type FieldFormatOverrides = Record<string, FieldFormat>;
