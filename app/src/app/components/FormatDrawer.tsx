// FormatDrawer — right-side slide-in panel for per-field text formatting.
//
// Opened from the "Aa" button on any text field in the Properties panel.
// Edits an entry in `project.fieldFormatOverrides` keyed by the field's
// descriptor path. All changes are optional and resolved against the
// template's designer-intent styles at render time by useFieldFormat().
//
// Controls surfaced:
//   - Family (from the role's CURATED_FAMILIES)
//   - Size (multiplier 50%–200% of template default)
//   - Weight (300 / 400 / 500 / 600 / 700)
//   - Italic toggle
//   - Color (picker + brand palette swatches)
//   - Letter-spacing (value + unit em|px)
//   - Line-height (unitless multiplier)
//   - Text transform (none / uppercase / lowercase / capitalize)
//   - Opacity (slider)
//   - Reset all for this field
//
// Mirrors MusicLibraryDrawer's enter/exit animation + backdrop + Esc
// close so the two drawers feel like one pattern.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type TransitionEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ColorField, TextField } from '../../ui/primitives';
import {
  CURATED_FAMILIES,
  type TypographyRole,
} from '../../engine/typography';
import {
  compactFieldFormat,
  isFieldFormatEmpty,
  type FieldFormat,
  type TextTransform,
} from '../../store/fieldFormat';
import { useBrand } from '../../store/brand';

const Z_DRAWER = 9201;

/** Role-typical defaults used to render the "Template default" swatch in
 *  the drawer's Preview section. These aren't the exact values every
 *  template uses — they're representative of each role's typical voice
 *  so marketers have a fixed reference to compare their override against.
 *  (Exact template defaults vary per template; wiring each template's
 *  actual base values into the drawer would be a much bigger refactor.) */
const ROLE_DEFAULTS: Record<
  TypographyRole,
  {
    family: string;
    weight: number;
    italic: boolean;
    size: number;
    letterSpacing: string;
    textTransform: 'none' | 'uppercase';
    color: string;
    sample: string;
  }
> = {
  display: {
    family: 'Cormorant Garamond',
    weight: 300,
    italic: true,
    size: 28,
    letterSpacing: '-0.02em',
    textTransform: 'none',
    color: 'rgba(255,255,255,0.92)',
    sample: 'The quick brown fox',
  },
  body: {
    family: 'Inter',
    weight: 500,
    italic: false,
    size: 14,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.92)',
    sample: 'Shop the edit · new in',
  },
  numeric: {
    family: 'Noto Serif Display',
    weight: 500,
    italic: false,
    size: 20,
    letterSpacing: '0.05em',
    textTransform: 'none',
    color: 'rgba(196,147,115,0.95)',
    sample: '1,890 AED',
  },
  arabic: {
    family: 'Noto Kufi Arabic',
    weight: 500,
    italic: false,
    size: 20,
    letterSpacing: 'normal',
    textTransform: 'none',
    color: 'rgba(255,255,255,0.92)',
    sample: 'الأناقة الهادئة · 135 د.إ.',
  },
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** FieldDescriptor.path the drawer is editing. Displayed as the subtitle. */
  fieldPath: string;
  /** Human label of the field (e.g. "Kicker"). */
  fieldLabel: string;
  /** Typography role for this field (decides which family list shows). */
  role: TypographyRole;
  /** Current override value — pass `{}` if the marketer hasn't touched the
   *  field yet. */
  value: FieldFormat;
  /** Called with the compacted override. Pass `{}` to clear the override. */
  onChange: (next: FieldFormat) => void;
};

// Section header inside the drawer body.
function DrawerSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: '18px 22px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// Row label + control — small inline label on the left, control on the right.
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '96px 1fr',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.55)',
          fontFamily: 'var(--sans)',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// Pill row — one-click options (e.g. weight pills, transform options).
function PillRow<T extends string | number>({
  value,
  onChange,
  options,
  fontFamily,
}: {
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  options: Array<{ value: T; label: string; hint?: string }>;
  fontFamily?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(active ? undefined : opt.value)}
            title={opt.hint}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontFamily: fontFamily ?? 'var(--sans)',
              fontWeight: active ? 700 : 500,
              color: active ? '#0A0A0A' : 'rgba(255,255,255,0.75)',
              background: active ? 'var(--editor-accent)' : 'var(--editor-panel-2)',
              border: `1px solid ${active ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'background 120ms, color 120ms, border-color 120ms',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Slider component — range input with accent styling.
function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: '100%',
        accentColor: 'var(--editor-accent)',
      }}
    />
  );
}

export function FormatDrawer({
  open,
  onClose,
  fieldPath,
  fieldLabel,
  role,
  value,
  onChange,
}: Props) {
  const [brand] = useBrand();
  const [present, setPresent] = useState(false);
  const [entered, setEntered] = useState(false);

  useLayoutEffect(() => {
    if (open) {
      setPresent(true);
      const r = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(r);
    }
    setEntered(false);
  }, [open]);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present, onClose]);

  const onAsideTransitionEnd = useCallback(
    (e: TransitionEvent<HTMLElement>) => {
      if (e.propertyName !== 'transform') return;
      if (!open) setPresent(false);
    },
    [open],
  );

  const patch = useCallback(
    (partial: Partial<FieldFormat>) => {
      onChange(compactFieldFormat({ ...value, ...partial }));
    },
    [onChange, value],
  );

  const resetAll = useCallback(() => {
    onChange({});
  }, [onChange]);

  if (!present) return null;

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const dur = reduceMotion ? '0.01ms' : undefined;
  const panelTransform = entered ? 'translate3d(0,0,0)' : 'translate3d(100%,0,0)';

  // Non-modal side panel — no backdrop, no blur, no pointer blocker.
  // The stage behind stays interactive + visible so marketers watch
  // format changes propagate to the scene in real time. Close via the
  // X button, Esc, or by clicking Aa on another field.
  const asideStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100vh',
    width: 'min(420px, 100vw)',
    maxWidth: 440,
    zIndex: Z_DRAWER,
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(195deg, #1a1a22 0%, #121218 42%, #0c0c10 100%)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '-24px 0 48px rgba(0,0,0,0.4)',
    transform: panelTransform,
    transition: dur ? `transform ${dur}` : 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'transform',
    overflowY: 'auto',
  };

  const families = CURATED_FAMILIES[role];
  const currentFamily = value.family ?? families[0];
  const activeWeight = value.weight;
  const activeSize = value.sizeScale ?? 1;
  const activeLetterSpacing = value.letterSpacing ?? '';
  const activeLineHeight = value.lineHeight ?? '';
  const activeOpacity = value.opacity ?? 1;
  const nothingOverridden = isFieldFormatEmpty(value);

  return createPortal(
    <aside
      role="region"
      aria-labelledby="format-drawer-title"
      style={asideStyle}
      onTransitionEnd={onAsideTransitionEnd}
    >
        {/* Header */}
        <header
          style={{
            flexShrink: 0,
            padding: '20px 22px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'linear-gradient(180deg, rgba(196,147,115,0.08) 0%, transparent 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(196,147,115,0.8)',
                  marginBottom: 6,
                }}
              >
                Format · {role}
              </div>
              <div
                id="format-drawer-title"
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 22,
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.95)',
                  lineHeight: 1.2,
                }}
              >
                {fieldLabel}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: 4,
                  fontFamily: 'var(--mono)',
                }}
              >
                {fieldPath}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.35)',
                  marginTop: 8,
                  fontFamily: 'var(--sans)',
                  letterSpacing: '0.04em',
                }}
              >
                ↑↓ or j/k to move between fields · Esc to close
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close format drawer"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.75)',
                width: 32,
                height: 32,
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        </header>

        {/* Before/after preview — the template's role-typical default on
         *  the left, the marketer's current override on the right. When
         *  no override is set, both samples look identical — the contrast
         *  communicates "your changes are making this look different." */}
        <DrawerSection label={nothingOverridden ? 'Preview · Template default' : 'Preview · Default → Your override'}>
          {(() => {
            const d = ROLE_DEFAULTS[role];
            const overrideFamily = value.family ?? d.family;
            const overrideWeight = value.weight ?? d.weight;
            const overrideItalic = value.italic ?? d.italic;
            const overrideSize = d.size * (value.sizeScale ?? 1);
            const overrideColor = value.color ?? d.color;
            const overrideLetterSpacing = value.letterSpacing ?? d.letterSpacing;
            const overrideLineHeight = value.lineHeight;
            const overrideTransform = value.textTransform ?? d.textTransform;
            const overrideOpacity = value.opacity ?? 1;

            const baseSwatch: CSSProperties = {
              padding: '14px 16px',
              background: 'var(--editor-panel-2)',
              border: '1px solid var(--editor-border)',
              borderRadius: 4,
              minHeight: 64,
              display: 'flex',
              alignItems: 'center',
              direction: role === 'arabic' ? 'rtl' : 'ltr',
              lineHeight: 1.2,
            };

            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: nothingOverridden ? '1fr' : '1fr 1fr',
                  gap: 10,
                }}
              >
                {/* Template default — always shown */}
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.35)',
                      marginBottom: 6,
                      fontFamily: 'var(--sans)',
                    }}
                  >
                    Default
                  </div>
                  <div style={{ ...baseSwatch, opacity: 0.55 }}>
                    <span
                      style={{
                        fontFamily: `'${d.family}', serif`,
                        fontWeight: d.weight,
                        fontStyle: d.italic ? 'italic' : 'normal',
                        fontSize: d.size,
                        letterSpacing: d.letterSpacing,
                        textTransform: d.textTransform,
                        color: d.color,
                      }}
                    >
                      {d.sample}
                    </span>
                  </div>
                </div>

                {/* Override preview — only when something's been customised */}
                {!nothingOverridden && (
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--editor-accent)',
                        marginBottom: 6,
                        fontFamily: 'var(--sans)',
                      }}
                    >
                      Your override
                    </div>
                    <div style={baseSwatch}>
                      <span
                        style={{
                          fontFamily: `'${overrideFamily}', serif`,
                          fontWeight: overrideWeight,
                          fontStyle: overrideItalic ? 'italic' : 'normal',
                          fontSize: overrideSize,
                          letterSpacing: overrideLetterSpacing,
                          lineHeight: overrideLineHeight,
                          textTransform: overrideTransform,
                          color: overrideColor,
                          opacity: overrideOpacity,
                        }}
                      >
                        {d.sample}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DrawerSection>

        {/* Family — each option rendered IN its own family so marketers
         *  can compare typefaces visually before committing. */}
        <DrawerSection label="Family">
          <div
            role="radiogroup"
            aria-label="Font family"
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {families.map((f) => {
              const active = currentFamily === f;
              return (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => patch({ family: f })}
                  style={{
                    textAlign: role === 'arabic' ? 'right' : 'left',
                    direction: role === 'arabic' ? 'rtl' : 'ltr',
                    padding: '10px 14px',
                    background: active ? 'var(--editor-panel-2)' : 'transparent',
                    border: `1px solid ${active ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    color: active ? 'var(--editor-text)' : 'rgba(255,255,255,0.75)',
                    // Render the family name in the family itself so the
                    // dropdown doubles as a live comparison.
                    fontFamily: `'${f}', serif`,
                    fontSize: role === 'display' ? 22 : 17,
                    fontStyle: role === 'display' ? 'italic' : 'normal',
                    fontWeight: role === 'body' ? 500 : 400,
                    letterSpacing: role === 'display' ? '-0.02em' : 'normal',
                    lineHeight: 1.2,
                    transition: 'background 120ms, border-color 120ms',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span>{f}</span>
                  {active && (
                    <span
                      aria-hidden
                      style={{
                        fontSize: 10,
                        fontFamily: 'var(--sans)',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: 'var(--editor-accent)',
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Live preview of the chosen family */}
          <div
            style={{
              marginTop: 12,
              padding: '14px 16px',
              background: 'var(--editor-panel-2)',
              border: '1px solid var(--editor-border)',
              borderRadius: 3,
              fontFamily: `'${currentFamily}', serif`,
              fontSize: 20,
              fontWeight: activeWeight ?? 500,
              fontStyle: value.italic ? 'italic' : 'normal',
              color: value.color ?? 'rgba(255,255,255,0.9)',
              textTransform: value.textTransform,
              letterSpacing: value.letterSpacing,
              lineHeight: value.lineHeight,
              opacity: activeOpacity,
              direction: role === 'arabic' ? 'rtl' : 'ltr',
            }}
          >
            {role === 'arabic'
              ? 'الأناقة الهادئة · 135 د.إ.'
              : 'The quick brown fox'}
          </div>
          {value.family && (
            <button
              type="button"
              onClick={() => patch({ family: undefined })}
              style={{
                marginTop: 10,
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)',
                background: 'transparent',
                border: 0,
                padding: 0,
                cursor: 'pointer',
              }}
            >
              Reset family
            </button>
          )}
        </DrawerSection>

        {/* Size */}
        <DrawerSection label="Size">
          <Row label="Scale">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Slider
                value={activeSize}
                min={0.5}
                max={2}
                step={0.05}
                onChange={(v) => patch({ sizeScale: v === 1 ? undefined : v })}
              />
              <span
                style={{
                  minWidth: 50,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.75)',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {Math.round(activeSize * 100)}%
              </span>
            </div>
          </Row>
        </DrawerSection>

        {/* Weight */}
        <DrawerSection label="Weight">
          <PillRow<number>
            value={activeWeight}
            onChange={(v) => patch({ weight: v })}
            options={[
              { value: 300, label: 'Light' },
              { value: 400, label: 'Regular' },
              { value: 500, label: 'Medium' },
              { value: 600, label: 'SemiBold' },
              { value: 700, label: 'Bold' },
            ]}
          />
        </DrawerSection>

        {/* Italic + Text transform */}
        <DrawerSection label="Style">
          <Row label="Italic">
            <button
              type="button"
              onClick={() => patch({ italic: value.italic ? undefined : true })}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontStyle: 'italic',
                fontWeight: 500,
                color: value.italic ? '#0A0A0A' : 'rgba(255,255,255,0.75)',
                background: value.italic ? 'var(--editor-accent)' : 'var(--editor-panel-2)',
                border: `1px solid ${value.italic ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
                borderRadius: 3,
                cursor: 'pointer',
                width: 64,
                fontFamily: 'var(--serif)',
              }}
            >
              I
            </button>
          </Row>
          <Row label="Transform">
            <PillRow<TextTransform>
              value={value.textTransform}
              onChange={(v) => patch({ textTransform: v })}
              options={[
                { value: 'none', label: 'None' },
                { value: 'uppercase', label: 'UPPER' },
                { value: 'lowercase', label: 'lower' },
                { value: 'capitalize', label: 'Title' },
              ]}
            />
          </Row>
        </DrawerSection>

        {/* Color */}
        <DrawerSection label="Color">
          <Row label="Color">
            <ColorField
              value={value.color ?? '#ffffff'}
              onChange={(v) => patch({ color: v })}
            />
          </Row>
          <Row label="Brand">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(
                [
                  { key: 'background', label: 'BG' },
                  { key: 'paper', label: 'Paper' },
                  { key: 'accent', label: 'Accent' },
                  { key: 'accentDark', label: 'Accent·D' },
                ] as const
              ).map(({ key, label }) => {
                const swatchColor = brand.colors[key];
                const active = value.color === swatchColor;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => patch({ color: active ? undefined : swatchColor })}
                    title={`${label} · ${swatchColor}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px 4px 4px',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: active ? '#0A0A0A' : 'rgba(255,255,255,0.8)',
                      background: active ? 'var(--editor-accent)' : 'var(--editor-panel-2)',
                      border: `1px solid ${active ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
                      borderRadius: 3,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 2,
                        background: swatchColor,
                        border: '1px solid rgba(0,0,0,0.2)',
                      }}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </Row>
          {value.color !== undefined && (
            <button
              type="button"
              onClick={() => patch({ color: undefined })}
              style={{
                marginTop: 4,
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)',
                background: 'transparent',
                border: 0,
                padding: 0,
                cursor: 'pointer',
              }}
            >
              Reset color
            </button>
          )}
        </DrawerSection>

        {/* Spacing */}
        <DrawerSection label="Spacing">
          <Row label="Letter-spacing">
            <TextField
              value={activeLetterSpacing}
              placeholder="0.05em · 6px"
              onChange={(e) => {
                const v = e.target.value.trim();
                patch({ letterSpacing: v === '' ? undefined : v });
              }}
            />
          </Row>
          <Row label="Line-height">
            <TextField
              type="number"
              step="0.05"
              min={0.8}
              max={2.4}
              value={activeLineHeight}
              placeholder="1.2"
              onChange={(e) => {
                const v = e.target.value.trim();
                patch({
                  lineHeight: v === '' ? undefined : Number(v),
                });
              }}
            />
          </Row>
        </DrawerSection>

        {/* Opacity */}
        <DrawerSection label="Opacity">
          <Row label="Opacity">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Slider
                value={activeOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) =>
                  patch({ opacity: v === 1 ? undefined : v })
                }
              />
              <span
                style={{
                  minWidth: 50,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.75)',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {Math.round(activeOpacity * 100)}%
              </span>
            </div>
          </Row>
        </DrawerSection>

        {/* Reset all */}
        <div
          style={{
            padding: '18px 22px 28px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <button
            type="button"
            onClick={resetAll}
            disabled={nothingOverridden}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: nothingOverridden ? 'rgba(255,255,255,0.35)' : 'rgba(216,82,88,0.9)',
              background: 'transparent',
              border: `1px solid ${nothingOverridden ? 'rgba(255,255,255,0.1)' : 'rgba(216,82,88,0.5)'}`,
              borderRadius: 'var(--r-md)',
              cursor: nothingOverridden ? 'not-allowed' : 'pointer',
              transition: 'border-color 120ms, color 120ms',
            }}
          >
            {nothingOverridden ? 'No overrides to reset' : 'Reset all formatting'}
          </button>
        </div>
    </aside>,
    document.body,
  );
}
