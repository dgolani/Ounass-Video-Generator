import { useMemo } from 'react';
import type { FieldDescriptor } from '../../templates/fields';
import { PropertiesPanel } from './PropertiesPanel';

/** Paths surfaced in the left “brand” column (also stripped from the right Properties list). */
export function collectBrandColumnExcludePaths(fields: FieldDescriptor[]): Set<string> {
  const ex = new Set<string>();
  if (fields.some((f) => f.kind === 'image' && f.path === 'logo')) {
    ex.add('logo');
  }
  if (fields.some((f) => f.kind === 'productList' && f.path === 'products')) {
    ex.add('products');
  }
  for (const f of fields) {
    if (f.kind === 'color') ex.add(f.path);
  }
  return ex;
}

function buildLeftPanelFields(fields: FieldDescriptor[]): FieldDescriptor[] {
  const out: FieldDescriptor[] = [];
  const products = fields.find((f) => f.kind === 'productList' && f.path === 'products');
  if (products) {
    out.push({ kind: 'section', label: 'PRODUCTS' });
    out.push(products);
  }
  const logo = fields.find((f) => f.kind === 'image' && f.path === 'logo');
  const colors = fields.filter((f) => f.kind === 'color');
  if (logo || colors.length) {
    out.push({ kind: 'section', label: 'BRAND KIT' });
    if (logo) out.push(logo);
    out.push(...colors);
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
};

export function EditorBrandPanel({ leftPaneFields, value, onChange }: Props) {
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
    <PropertiesPanel fields={leftPaneFields} value={value} onChange={onChange} compact />
  );
}
