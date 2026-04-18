import { useMemo } from 'react';
import type { FieldDescriptor } from '../../templates/fields';
import { PropertiesPanel } from './PropertiesPanel';

function isBrandColumnImage(f: FieldDescriptor): f is Extract<FieldDescriptor, { kind: 'image' }> {
  return f.kind === 'image' && (f.path === 'logo' || f.brandColumn === true);
}

function isBrandColumnProductList(
  f: FieldDescriptor,
): f is Extract<FieldDescriptor, { kind: 'productList' }> {
  return f.kind === 'productList' && (f.path === 'products' || f.brandColumn === true);
}

function isBrandColumnColor(f: FieldDescriptor): f is Extract<FieldDescriptor, { kind: 'color' }> {
  return f.kind === 'color' && f.brandColumn !== false;
}

/** Paths surfaced in the left “brand” column (also stripped from the right Properties list). */
export function collectBrandColumnExcludePaths(fields: FieldDescriptor[]): Set<string> {
  const ex = new Set<string>();
  for (const f of fields) {
    if (isBrandColumnImage(f) || isBrandColumnProductList(f) || isBrandColumnColor(f)) {
      ex.add(f.path);
    }
  }
  return ex;
}

function buildLeftPanelFields(fields: FieldDescriptor[]): FieldDescriptor[] {
  const out: FieldDescriptor[] = [];
  const productFields = fields.filter(isBrandColumnProductList);
  if (productFields.length) {
    out.push({ kind: 'section', label: 'PRODUCTS' });
    out.push(...productFields);
  }
  const brandImages = fields.filter(isBrandColumnImage);
  const colorFields = fields.filter(isBrandColumnColor);
  if (brandImages.length || colorFields.length) {
    out.push({ kind: 'section', label: 'BRAND KIT' });
    out.push(...brandImages);
    out.push(...colorFields);
  }
  return out;
}

/** Drop excluded fields and remove section headers that no longer have any following fields. */
export function excludeFieldsFromPanel(
  all: FieldDescriptor[],
  exclude: Set<string>,
): FieldDescriptor[] {
  const kept = all.filter((f) => {
    if (f.kind === 'section') return true;
    if ('path' in f && exclude.has(f.path)) return false;
    return true;
  });

  const out: FieldDescriptor[] = [];
  let i = 0;
  while (i < kept.length) {
    const f = kept[i];
    if (f.kind !== 'section') {
      out.push(f);
      i++;
      continue;
    }
    const start = i;
    i++;
    while (i < kept.length && kept[i].kind !== 'section') i++;
    const end = i;
    if (end > start + 1) {
      out.push(kept[start]);
      for (let k = start + 1; k < end; k++) out.push(kept[k]);
    }
  }
  return out;
}

export function splitEditorFields(fields: FieldDescriptor[]) {
  const exclude = collectBrandColumnExcludePaths(fields);
  const left = buildLeftPanelFields(fields);
  const right = excludeFieldsFromPanel(fields, exclude);
  return { leftPaneFields: left, rightPaneFields: right };
}

type Props = {
  leftPaneFields: FieldDescriptor[];
  value: unknown;
  onChange: (next: unknown) => void;
  activeSceneId?: string | null;
};

export function EditorBrandPanel({
  leftPaneFields,
  value,
  onChange,
  activeSceneId = null,
}: Props) {
  const emptyHint = useMemo(
    () => (
      <div
        style={{
          padding: '24px 16px',
          color: 'var(--editor-text-dim)',
          fontSize: 13,
          lineHeight: 1.55,
          fontFamily: 'var(--sans)',
        }}
      >
        Scene timing lives on the timeline. Brand controls for this template are in the{' '}
        <strong style={{ color: 'var(--editor-text)', fontWeight: 600 }}>Properties</strong>{' '}
        column.
      </div>
    ),
    [],
  );

  if (!leftPaneFields.length) {
    return emptyHint;
  }

  return (
    <PropertiesPanel
      fields={leftPaneFields}
      value={value}
      onChange={onChange}
      compact
      activeSceneId={activeSceneId}
    />
  );
}
