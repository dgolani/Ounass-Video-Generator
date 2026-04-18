import { useState } from 'react';
import { PageHeader } from '../Shell';
import {
  Button,
  ColorField,
  Field,
  Section,
  Stack,
  TextField,
} from '../../ui/primitives';
import { useBrand, resetBrand, DEFAULT_BRAND } from '../../store/brand';
import { ImageDropZone } from '../components/PropertiesPanel';

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
    </div>
  );
}
