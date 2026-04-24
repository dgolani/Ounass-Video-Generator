import { useState, type CSSProperties } from 'react';
import { PageHeader } from '../Shell';
import {
  Button,
  ColorField,
  Field,
  Section,
  Stack,
  TextField,
} from '../../ui/primitives';
import { isSvgDataURL } from '../../lib/logo';
import {
  useBrand,
  resetBrand,
  DEFAULT_BRAND,
  type BrandKit,
  type Locale,
} from '../../store/brand';
import { BoutiqueLogo } from '../../templates/BoutiqueLogo';
import { ImageDropZone } from '../components/PropertiesPanel';
import {
  CURATED_FAMILIES,
  DEFAULT_TYPOGRAPHY,
  type TypographyRole,
  type FontChoice,
} from '../../engine/typography';
import {
  DEFAULT_SAFE_ZONES,
  type AspectKey,
  type SafeZone,
} from '../../engine';

// ── Logo-on-background preview (unchanged) ───────────────────────────────
function LogoBgPreview({
  label,
  background,
  logoUrl,
  tone,
  boutiqueName,
}: {
  label: string;
  background: string;
  logoUrl: string;
  tone: 'dark' | 'light';
  boutiqueName: string;
}) {
  const border =
    tone === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)';
  const maskFill = tone === 'dark' ? '#f5f5f7' : '#121214';

  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--editor-text-dim)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          borderRadius: 'var(--r-md)',
          background,
          border,
          minHeight: 88,
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        {isSvgDataURL(logoUrl) ? (
          <BoutiqueLogo
            logo={logoUrl}
            boutiqueName={boutiqueName}
            color={maskFill}
            width={200}
            height={48}
          />
        ) : (
          <img
            src={logoUrl}
            alt=""
            aria-hidden
            style={{
              maxWidth: '100%',
              maxHeight: 48,
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              filter: tone === 'dark' ? 'brightness(0) invert(1)' : undefined,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Tiny Select helper (used by Typography) ──────────────────────────────
function Select({
  value,
  onChange,
  options,
  style,
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: Array<string | { value: string | number; label: string }>;
  style?: CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'var(--editor-panel-2)',
        color: 'var(--editor-text)',
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-md)',
        padding: '10px 12px',
        fontFamily: 'var(--sans)',
        fontSize: 13,
        outline: 'none',
        width: '100%',
        cursor: 'pointer',
        appearance: 'none',
        ...style,
      }}
    >
      {options.map((opt) => {
        const o =
          typeof opt === 'string' ? { value: opt, label: opt } : opt;
        return (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        );
      })}
    </select>
  );
}

// ── Segmented control ────────────────────────────────────────────────────
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        background: 'var(--editor-panel-2)',
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-md)',
        padding: 2,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={{
              background: active ? 'var(--editor-accent)' : 'transparent',
              color: active ? '#0A0A0A' : 'var(--editor-text-dim)',
              border: 0,
              padding: '8px 16px',
              fontFamily: 'var(--sans)',
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.04em',
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'background 120ms',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Safe Zones section ───────────────────────────────────────────────────
const ASPECT_TABS: Array<{ key: AspectKey; label: string; hint: string }> = [
  { key: '9:16', label: '9:16', hint: 'Stories / Reels' },
  { key: '4:5', label: '4:5', hint: 'Feed' },
  { key: '9:16-no-chrome', label: '9:16 · No chrome', hint: 'WhatsApp / DOOH / email' },
];

function SafeZonesSection({
  value,
  onChange,
}: {
  value: Record<AspectKey, SafeZone>;
  onChange: (next: Record<AspectKey, SafeZone>) => void;
}) {
  const [active, setActive] = useState<AspectKey>('9:16');
  const zone = value[active] ?? DEFAULT_SAFE_ZONES[active];

  const patch = (part: Partial<SafeZone>) => {
    onChange({ ...value, [active]: { ...zone, ...part } });
  };

  const resetActive = () => {
    onChange({ ...value, [active]: DEFAULT_SAFE_ZONES[active] });
  };

  const isDefault =
    zone.top === DEFAULT_SAFE_ZONES[active].top &&
    zone.bottom === DEFAULT_SAFE_ZONES[active].bottom &&
    zone.left === DEFAULT_SAFE_ZONES[active].left &&
    zone.right === DEFAULT_SAFE_ZONES[active].right;

  return (
    <div>
      <Section label="Safe zones" />
      <p
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 12,
          lineHeight: 1.6,
          color: 'var(--editor-text-dim)',
          marginTop: 10,
          marginBottom: 20,
        }}
      >
        Keep-clear margins (in base-canvas pixels) for each aspect. Templates anchor CTAs, kickers, dots, and badges inside these zones so platform UI overlays — Instagram caption, TikTok like-stack, story progress bar — don&apos;t cover critical copy.
      </p>

      {/* Aspect tab strip */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {ASPECT_TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              style={{
                background: isActive ? 'var(--editor-panel-2)' : 'transparent',
                border: isActive
                  ? '1px solid var(--editor-accent)'
                  : '1px solid var(--editor-border)',
                color: isActive ? 'var(--editor-text)' : 'var(--editor-text-dim)',
                padding: '10px 14px',
                fontFamily: 'var(--sans)',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.04em',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                transition: 'background 120ms, border-color 120ms',
              }}
            >
              <span>{t.label}</span>
              <span style={{ fontSize: 10, color: 'var(--editor-text-dim)', fontWeight: 500 }}>
                {t.hint}
              </span>
            </button>
          );
        })}
      </div>

      {/* Four numeric inputs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          maxWidth: 600,
        }}
      >
        {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
          <Field key={side} label={`${side[0].toUpperCase()}${side.slice(1)}`}>
            <TextField
              type="number"
              value={zone[side]}
              onChange={(e) =>
                patch({ [side]: Math.max(0, Number(e.target.value) || 0) })
              }
              min={0}
            />
          </Field>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <Button variant="ghost" size="sm" onClick={resetActive} disabled={isDefault}>
          {isDefault ? 'Matches default' : `Reset ${active} to default`}
        </Button>
      </div>
    </div>
  );
}

// ── Typography section ───────────────────────────────────────────────────
const ROLE_META: Record<
  TypographyRole,
  { label: string; hint: string; sample: string; sampleSize: number; italic: boolean }
> = {
  display: {
    label: 'Display',
    hint: 'Big italic headlines, hero refrains',
    sample: 'The Considered Wardrobe',
    sampleSize: 34,
    italic: true,
  },
  body: {
    label: 'Body',
    hint: 'Kickers, captions, CTAs',
    sample: 'SHOP THE EDIT · NEW IN',
    sampleSize: 15,
    italic: false,
  },
  numeric: {
    label: 'Numeric',
    hint: 'Prices, badges, countdowns',
    sample: '1,890 AED · 12,400 AED',
    sampleSize: 20,
    italic: false,
  },
  arabic: {
    label: 'Arabic',
    hint: 'RTL copy + Arabic script (prices keep Latin digits)',
    sample: 'الأناقة الهادئة · 135 د.إ.',
    sampleSize: 20,
    italic: false,
  },
};

const WEIGHT_OPTIONS = [
  { value: '300', label: '300 · Light' },
  { value: '400', label: '400 · Regular' },
  { value: '500', label: '500 · Medium' },
  { value: '600', label: '600 · SemiBold' },
  { value: '700', label: '700 · Bold' },
];

function TypographyTile({
  role,
  value,
  onChange,
}: {
  role: TypographyRole;
  value: FontChoice;
  onChange: (next: FontChoice) => void;
}) {
  const meta = ROLE_META[role];
  const families = CURATED_FAMILIES[role];

  return (
    <div
      style={{
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-md)',
        padding: 18,
        background: 'var(--editor-panel)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--editor-text)',
            }}
          >
            {meta.label}
          </div>
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 11,
              color: 'var(--editor-text-dim)',
              marginTop: 4,
            }}
          >
            {meta.hint}
          </div>
        </div>
      </div>

      <Stack gap={12}>
        <Field label="Family">
          <Select
            value={value.family}
            onChange={(v) => onChange({ ...value, family: v })}
            options={families}
          />
        </Field>
        <Field label="Weight">
          <Select
            value={String(value.weight)}
            onChange={(v) => onChange({ ...value, weight: Number(v) })}
            options={WEIGHT_OPTIONS}
          />
        </Field>
      </Stack>

      {/* Live sample */}
      <div
        style={{
          marginTop: 16,
          padding: '16px 18px',
          background: 'var(--editor-panel-2)',
          borderRadius: 'var(--r-sm)',
          border: '1px solid var(--editor-border)',
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          direction: role === 'arabic' ? 'rtl' : 'ltr',
        }}
      >
        <span
          style={{
            fontFamily: `'${value.family}', serif`,
            fontWeight: value.weight,
            fontSize: meta.sampleSize,
            fontStyle: meta.italic ? 'italic' : 'normal',
            color: 'var(--editor-text)',
            lineHeight: 1.2,
            letterSpacing: role === 'display' ? '-0.02em' : '0.01em',
          }}
        >
          {meta.sample}
        </span>
      </div>
    </div>
  );
}

function TypographySection({
  value,
  onChange,
}: {
  value: BrandKit['typography'];
  onChange: (next: BrandKit['typography']) => void;
}) {
  return (
    <div>
      <Section label="Typography" />
      <p
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 12,
          lineHeight: 1.6,
          color: 'var(--editor-text-dim)',
          marginTop: 10,
          marginBottom: 20,
        }}
      >
        Pick the font family and weight for each role. Every template references these via CSS variables, so switching here repaints all 9 templates instantly. Portrait is self-hosted (licensed for Ounass); alternates are Google Fonts.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          maxWidth: 860,
        }}
      >
        {(Object.keys(value) as TypographyRole[]).map((role) => (
          <TypographyTile
            key={role}
            role={role}
            value={value[role]}
            onChange={(next) => onChange({ ...value, [role]: next })}
          />
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_TYPOGRAPHY)}
          disabled={
            JSON.stringify(value) === JSON.stringify(DEFAULT_TYPOGRAPHY)
          }
        >
          Reset typography to default
        </Button>
      </div>
    </div>
  );
}

// ── Locale + Currency section ────────────────────────────────────────────
function LocaleSection({
  locale,
  currencyByLocale,
  onLocaleChange,
  onCurrencyChange,
}: {
  locale: Locale;
  currencyByLocale: BrandKit['currencyByLocale'];
  onLocaleChange: (next: Locale) => void;
  onCurrencyChange: (l: Locale, v: string) => void;
}) {
  return (
    <div>
      <Section label="Locale & currency" />
      <p
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 12,
          lineHeight: 1.6,
          color: 'var(--editor-text-dim)',
          marginTop: 10,
          marginBottom: 20,
        }}
      >
        Default locale for new ads. Flipping to Arabic triggers RTL layout + Arabic typography at the scene level. Currency suffix is appended to prices per locale; digits always stay Latin (e.g. <code>135 AED</code> / <code>135 د.إ.</code>).
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 32,
          maxWidth: 600,
        }}
      >
        <Field label="Default locale">
          <Segmented<Locale>
            value={locale}
            onChange={onLocaleChange}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' },
            ]}
          />
        </Field>
        <div />
        <Field label="Currency suffix · English">
          <TextField
            value={currencyByLocale.en}
            onChange={(e) => onCurrencyChange('en', e.target.value)}
            placeholder="AED"
          />
        </Field>
        <Field label="Currency suffix · Arabic">
          <TextField
            value={currencyByLocale.ar}
            onChange={(e) => onCurrencyChange('ar', e.target.value)}
            placeholder="د.إ."
            style={{ direction: 'rtl' }}
          />
        </Field>
      </div>
    </div>
  );
}

// ── Root route ───────────────────────────────────────────────────────────
export function BrandKitRoute() {
  const [brand, setBrand] = useBrand();
  const [flash, setFlash] = useState<string>('');

  const update = <K extends keyof typeof brand>(key: K, value: typeof brand[K]) => {
    setBrand({ ...brand, [key]: value });
    setFlash('Saved');
    setTimeout(() => setFlash(''), 1200);
  };

  const updateColor = (key: keyof typeof brand.colors, value: string) => {
    setBrand({ ...brand, colors: { ...brand.colors, [key]: value } });
    setFlash('Saved');
    setTimeout(() => setFlash(''), 1200);
  };

  return (
    <div>
      <PageHeader
        kicker="Defaults"
        title="Brand kit"
        actions={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {flash && (
              <span
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 11,
                  color: 'var(--success)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                {flash}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!confirm('Reset brand kit to defaults?')) return;
                resetBrand();
                setBrand(DEFAULT_BRAND);
              }}
            >
              Reset
            </Button>
          </div>
        }
      />

      {/* Top: Boutique + Brand colors (existing) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
          maxWidth: 860,
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--editor-text-dim)',
              marginBottom: 32,
            }}
          >
            Brand kit values are applied as defaults whenever you start a new ad from a template. Existing ads are not affected — edit them directly.
          </p>

          <Section label="Boutique" />
          <Stack gap={16} style={{ marginTop: 16 }}>
            <Field label="Boutique name">
              <TextField
                value={brand.boutiqueName}
                onChange={(e) => update('boutiqueName', e.target.value)}
                placeholder="Ounass"
              />
            </Field>
            <Field
              label="Boutique logo"
              hint="SVG only — the wordmark is recoloured to match each template's palette, so one file works on every background. Leave empty to fall back to a text wordmark."
            >
              <ImageDropZone
                url={brand.logo ?? ''}
                aspectRatio={16 / 9}
                size="large"
                svgOnly
                onImage={(dataURL) => update('logo', dataURL)}
                onClear={() => update('logo', undefined)}
              />
              {brand.logo ? (
                <div
                  style={{
                    marginTop: 14,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <LogoBgPreview
                    label="Dark background"
                    background="#0c0c0f"
                    tone="dark"
                    logoUrl={brand.logo}
                    boutiqueName={brand.boutiqueName}
                  />
                  <LogoBgPreview
                    label="Light background"
                    background="#f5f5f7"
                    tone="light"
                    logoUrl={brand.logo}
                    boutiqueName={brand.boutiqueName}
                  />
                </div>
              ) : null}
            </Field>
          </Stack>
        </div>

        <div>
          <Section label="Brand colors" />
          <Stack gap={16} style={{ marginTop: 16 }}>
            <Field label="Background">
              <ColorField
                value={brand.colors.background}
                onChange={(v) => updateColor('background', v)}
              />
            </Field>
            <Field label="Text / paper">
              <ColorField
                value={brand.colors.paper}
                onChange={(v) => updateColor('paper', v)}
              />
            </Field>
            <Field label="Accent">
              <ColorField
                value={brand.colors.accent}
                onChange={(v) => updateColor('accent', v)}
              />
            </Field>
            <Field label="Accent dark">
              <ColorField
                value={brand.colors.accentDark}
                onChange={(v) => updateColor('accentDark', v)}
              />
            </Field>
          </Stack>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'var(--editor-border)',
          margin: '48px 0 40px',
          maxWidth: 860,
        }}
      />

      {/* Typography */}
      <div style={{ marginBottom: 48 }}>
        <TypographySection
          value={brand.typography}
          onChange={(next) => update('typography', next)}
        />
      </div>

      {/* Safe zones */}
      <div style={{ marginBottom: 48 }}>
        <SafeZonesSection
          value={brand.safeZones}
          onChange={(next) => update('safeZones', next)}
        />
      </div>

      {/* Locale + Currency */}
      <div style={{ marginBottom: 64 }}>
        <LocaleSection
          locale={brand.locale}
          currencyByLocale={brand.currencyByLocale}
          onLocaleChange={(next) => update('locale', next)}
          onCurrencyChange={(l, v) =>
            update('currencyByLocale', { ...brand.currencyByLocale, [l]: v })
          }
        />
      </div>
    </div>
  );
}
