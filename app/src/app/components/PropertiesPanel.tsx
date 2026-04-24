import { useRef, useState } from 'react';
import {
  Button,
  ColorField,
  Field,
  Section,
  Stack,
  TextField,
  Textarea,
} from '../../ui/primitives';
import type {
  FieldDescriptor,
  FieldRole,
  ProductListSubField,
} from '../../templates/fields';
import { getPath, setPath } from '../../lib/path';
import { resizeImageToDataURL } from '../../lib/image';
import {
  isSvgFile,
  readFileAsText,
  sanitizeSvg,
  svgToDataURL,
} from '../../lib/logo';
import { uid } from '../../lib/uid';

type Props = {
  fields: FieldDescriptor[];
  value: unknown;
  onChange: (next: unknown) => void;
  /** Tighter padding for the narrow left brand column */
  compact?: boolean;
  /** Current timeline scene id (`meta.scenes`) — highlights matching `sceneIds` on text fields */
  activeSceneId?: string | null;
  /** Field paths with a non-empty format override — lights up the "Aa" button so
   *  marketers can tell at a glance which fields have been customized. */
  overriddenPaths?: Set<string>;
  /** Open the Format drawer for a specific text field. When provided, every
   *  text field renders a small "Aa" icon next to the input. */
  onOpenFormatField?: (
    path: string,
    label: string,
    role: FieldRole,
  ) => void;
};

function sceneIdsActive(
  sceneIds: string[] | undefined,
  activeSceneId: string | null | undefined,
): boolean {
  if (activeSceneId == null || !sceneIds?.length) return false;
  return sceneIds.includes(activeSceneId);
}

/** Tight halo on the input only (label stays unstyled). */
function sceneInputHaloClass(active: boolean): string {
  return ['editor-scene-input-halo', active && 'editor-scene-input-halo--active']
    .filter(Boolean)
    .join(' ');
}

/** Small "Aa" button that opens the Format drawer for a text field.
 *  Lit when the field has any override applied. */
function FormatButton({
  onClick,
  hasOverride,
  label,
}: {
  onClick: () => void;
  hasOverride: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Format ${label}`}
      title={hasOverride ? `Format · customised` : `Format ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        padding: 0,
        background: hasOverride ? 'var(--editor-accent)' : 'var(--editor-panel-2)',
        color: hasOverride ? '#0A0A0A' : 'var(--editor-text-dim)',
        border: `1px solid ${hasOverride ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
        borderRadius: 4,
        cursor: 'pointer',
        fontFamily: 'var(--serif)',
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1,
        transition: 'background 120ms, color 120ms, border-color 120ms',
        flexShrink: 0,
      }}
    >
      Aa
    </button>
  );
}

export function PropertiesPanel({
  fields,
  value,
  onChange,
  compact,
  activeSceneId = null,
  overriddenPaths,
  onOpenFormatField,
}: Props) {
  return (
    <div
      style={{
        padding: compact ? '16px 16px 48px' : '20px 24px 80px',
      }}
    >
      {fields.map((field, i) => {
        if (field.kind === 'section') {
          return <Section key={i} label={field.label} />;
        }

        const current = getPath(value, field.path);
        const set = (next: unknown) => onChange(setPath(value, field.path, next));

        if (field.kind === 'text') {
          const hi = sceneIdsActive(field.sceneIds, activeSceneId);
          const hasOverride = overriddenPaths?.has(field.path) ?? false;
          const role: FieldRole = field.role ?? 'body';
          const showFormatBtn = !!onOpenFormatField;
          return (
            <div key={i} style={{ marginTop: compact ? 12 : 16 }}>
              <Field label={field.label}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: showFormatBtn ? 'flex-start' : 'stretch',
                    gap: 8,
                  }}
                >
                  <div className={sceneInputHaloClass(hi)} style={{ flex: 1, minWidth: 0 }}>
                    {field.multiline ? (
                      <Textarea
                        value={String(current ?? '')}
                        onChange={(e) => set(e.target.value)}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <TextField
                        value={String(current ?? '')}
                        onChange={(e) => set(e.target.value)}
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                  {showFormatBtn && (
                    <FormatButton
                      hasOverride={hasOverride}
                      label={field.label}
                      onClick={() =>
                        onOpenFormatField?.(field.path, field.label, role)
                      }
                    />
                  )}
                </div>
              </Field>
            </div>
          );
        }

        if (field.kind === 'color') {
          return (
            <div key={i} style={{ marginTop: 16 }}>
              <Field label={field.label}>
                <ColorField
                  value={String(current ?? '#000000')}
                  onChange={set}
                />
              </Field>
            </div>
          );
        }

        if (field.kind === 'image') {
          const url = typeof current === 'string' ? current : '';
          const showFormatBtn = !!onOpenFormatField && (field.path === 'logo' || field.svgOnly === true);
          const hasOverride = overriddenPaths?.has(field.path) ?? false;
          return (
            <div key={i} style={{ marginTop: 16 }}>
              <Field label={field.label} hint={field.hint}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <ImageDropZone
                      url={url}
                      onImage={(dataURL) => set(dataURL)}
                      onClear={() => set('')}
                      aspectRatio={field.aspectRatio ?? 1}
                      size="large"
                      svgOnly={field.svgOnly}
                    />
                  </div>
                  {showFormatBtn && (
                    <FormatButton
                      hasOverride={hasOverride}
                      label={`${field.label} color`}
                      onClick={() =>
                        onOpenFormatField?.(
                          field.path,
                          `${field.label} color`,
                          'body',
                        )
                      }
                    />
                  )}
                </div>
              </Field>
            </div>
          );
        }

        if (field.kind === 'productList') {
          return (
            <ProductListField
              key={i}
              field={field}
              products={
                Array.isArray(current) ? (current as ProductShape[]) : []
              }
              onChange={set}
              activeSceneId={activeSceneId}
              compact={compact}
              overriddenPaths={overriddenPaths}
              onOpenFormatField={onOpenFormatField}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

type ProductShape = Record<string, unknown> & { id?: string };

function ProductListField({
  field,
  products,
  onChange,
  activeSceneId,
  compact,
  overriddenPaths,
  onOpenFormatField,
}: {
  field: Extract<FieldDescriptor, { kind: 'productList' }>;
  products: ProductShape[];
  onChange: (next: ProductShape[]) => void;
  activeSceneId?: string | null;
  compact?: boolean;
  overriddenPaths?: Set<string>;
  onOpenFormatField?: (
    path: string,
    label: string,
    role: FieldRole,
  ) => void;
}) {
  const min = field.minProducts ?? 1;
  const max = field.maxProducts ?? 20;
  const imagePath = field.imagePath ?? 'src';

  const atMax = products.length >= max;
  const atMin = products.length <= min;
  const globalImageScaleRaw = Number(products[0]?.imageScale ?? 1);
  const globalImageScale = Number.isFinite(globalImageScaleRaw)
    ? Math.min(1.5, Math.max(0.6, globalImageScaleRaw))
    : 1;

  const updateAt = (idx: number, next: ProductShape) => {
    const copy = [...products];
    copy[idx] = next;
    onChange(copy);
  };
  const removeAt = (idx: number) => {
    if (atMin) return;
    const copy = [...products];
    copy.splice(idx, 1);
    onChange(copy);
  };
  const move = (idx: number, delta: -1 | 1) => {
    const to = idx + delta;
    if (to < 0 || to >= products.length) return;
    const copy = [...products];
    [copy[idx], copy[to]] = [copy[to], copy[idx]];
    onChange(copy);
  };
  const add = () => {
    if (atMax) return;
    const template = field.newProductTemplate ?? {};
    const newProduct: ProductShape = { ...template, id: uid() };
    onChange([...products, newProduct]);
  };
  const setAllImageScale = (nextScale: number) => {
    onChange(
      products.map((p) => ({
        ...p,
        imageScale: nextScale,
      })),
    );
  };

  const listSceneHi = sceneIdsActive(field.sceneIds, activeSceneId);

  return (
    <div style={{ marginTop: compact ? 12 : 16 }}>
      <Field label="Product image scale" hint="Applies to all products in this template">
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--editor-border)',
            background: 'var(--editor-panel)',
          }}
        >
          <input
            type="range"
            min={0.6}
            max={1.5}
            step={0.02}
            value={globalImageScale}
            onChange={(e) => setAllImageScale(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </Field>

      {onOpenFormatField && field.productFields.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 10 }}>
          <Field label="Product text formatting" hint="Formatting here applies to all products">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {field.productFields.map((pf) => {
                const formatPath = `${field.path}.*.${pf.path}`;
                const hasOverride = overriddenPaths?.has(formatPath) ?? false;
                const role: FieldRole = pf.role ?? 'body';
                return (
                  <FormatButton
                    key={formatPath}
                    hasOverride={hasOverride}
                    label={`${pf.label} (all products)`}
                    onClick={() =>
                      onOpenFormatField(formatPath, `${pf.label} (all products)`, role)
                    }
                  />
                );
              })}
            </div>
          </Field>
        </div>
      )}

      <Stack gap={10}>
        {products.map((product, idx) => {
          const rowSceneId = field.productRowSceneIds?.[idx];
          const rowSceneMatch =
            rowSceneId != null && rowSceneId !== '' && rowSceneId === activeSceneId;
          return (
            <ProductRow
              key={(product.id as string) ?? idx}
              index={idx}
              total={products.length}
              product={product}
              productFields={field.productFields}
              imagePath={imagePath}
              atMin={atMin}
              activeSceneId={activeSceneId}
              listSceneHi={listSceneHi}
              rowSceneMatch={rowSceneMatch}
              onChange={(next) => updateAt(idx, next)}
              onRemove={() => removeAt(idx)}
              onMoveUp={() => move(idx, -1)}
              onMoveDown={() => move(idx, 1)}
            />
          );
        })}

        <Button
          size="sm"
          variant="secondary"
          onClick={add}
          disabled={atMax}
          style={{
            justifyContent: 'center',
            opacity: atMax ? 0.4 : 1,
          }}
          title={atMax ? `Max ${max} products` : undefined}
        >
          {field.addLabel ?? '+ Add product'}
        </Button>
      </Stack>
    </div>
  );
}

function ProductRow({
  index,
  total,
  product,
  productFields,
  imagePath,
  atMin,
  activeSceneId,
  listSceneHi,
  rowSceneMatch,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  total: number;
  product: ProductShape;
  productFields: ProductListSubField[];
  imagePath: string;
  atMin: boolean;
  activeSceneId?: string | null;
  /** Product list `sceneIds` matches (all rows’ inputs glow when subfields omit `sceneIds`) */
  listSceneHi?: boolean;
  /** Row index matches `productRowSceneIds[index]` */
  rowSceneMatch?: boolean;
  onChange: (next: ProductShape) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const imgUrl = typeof product[imagePath] === 'string' ? (product[imagePath] as string) : '';

  const setImage = (dataURL: string) => {
    onChange({ ...product, [imagePath]: dataURL });
  };

  return (
    <div
      style={{
        padding: 12,
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-md)',
        background: 'var(--editor-panel)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header: index + controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--editor-text-dim)',
          }}
        >
          Product {String(index + 1).padStart(2, '0')}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <RowIconButton
            title="Move up"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            ↑
          </RowIconButton>
          <RowIconButton
            title="Move down"
            onClick={onMoveDown}
            disabled={index === total - 1}
          >
            ↓
          </RowIconButton>
          <RowIconButton
            title={atMin ? 'Cannot remove — minimum reached' : 'Remove'}
            onClick={onRemove}
            disabled={atMin}
            danger
          >
            ×
          </RowIconButton>
        </div>
      </div>

      {/* Body: image + fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 12 }}>
        <ImageDropZone url={imgUrl} onImage={setImage} />
        <Stack gap={8}>
          {productFields.map((pf) => {
            const rowHi = sceneIdsActive(pf.sceneIds, activeSceneId);
            const subHasOwnScenes = Boolean(pf.sceneIds?.length);
            const inputActive = Boolean(
              rowSceneMatch ||
                rowHi ||
                (listSceneHi && !subHasOwnScenes),
            );
            return (
              <div
                key={pf.path}
                className={sceneInputHaloClass(inputActive)}
              >
                <TextField
                  value={String(product[pf.path] ?? '')}
                  onChange={(e) =>
                    onChange({ ...product, [pf.path]: e.target.value })
                  }
                  placeholder={pf.label}
                  style={{ padding: '6px 10px', fontSize: 12 }}
                />
              </div>
            );
          })}
        </Stack>
      </div>
    </div>
  );
}

export function ImageDropZone({
  url,
  onImage,
  onClear,
  aspectRatio,
  size = 'small',
  svgOnly = false,
}: {
  url: string;
  onImage: (dataURL: string) => void;
  onClear?: () => void;
  /** Width:height aspect ratio for the dropzone. Used for 'large' size. */
  aspectRatio?: number;
  size?: 'small' | 'large';
  /** When true, only SVG uploads are accepted. The file is stored as a
   *  `data:image/svg+xml` URL (after minimal sanitisation) — no raster
   *  resize. Used by the Brand Kit logo field so templates can recolour
   *  the logo via CSS mask-image. */
  svgOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      if (svgOnly) {
        if (!isSvgFile(file)) {
          throw new Error('SVG only — please upload a .svg file.');
        }
        const raw = await readFileAsText(file);
        const clean = sanitizeSvg(raw);
        onImage(svgToDataURL(clean));
      } else {
        const dataURL = await resizeImageToDataURL(file, 1080, 0.85);
        onImage(dataURL);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const border = dragActive
    ? '2px dashed var(--editor-accent)'
    : error
      ? '2px dashed #D85258'
      : '1px solid var(--editor-border)';

  const small = size === 'small';
  const containerStyle: React.CSSProperties = small
    ? { width: 88, height: 120 }
    : { width: '100%', aspectRatio: String(aspectRatio ?? 1) };

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        title={error ?? 'Click or drop an image'}
        style={{
          ...containerStyle,
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          background: 'var(--editor-panel-2)',
          border,
          position: 'relative',
          cursor: busy ? 'progress' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 120ms',
        }}
      >
        {url ? (
          <img
            src={url}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: small ? 'cover' : 'contain',
              padding: small ? 0 : 12,
            }}
          />
        ) : (
          <span
            style={{
              fontFamily: 'var(--sans)',
              fontSize: small ? 9 : 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--editor-text-dim)',
              textAlign: 'center',
              padding: '0 10px',
            }}
          >
            {busy
              ? 'Uploading'
              : svgOnly
                ? 'Drop SVG or click to upload'
                : small
                  ? 'Drop or click'
                  : 'Drop image or click to upload'}
          </span>
        )}
        {busy && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10,10,10,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--editor-accent)',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
            }}
          >
            …
          </div>
        )}
      </div>
      {url && onClear && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          title="Remove image"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: 11,
            border: 0,
            background: 'rgba(10,10,10,0.75)',
            color: '#fff',
            fontFamily: 'var(--sans)',
            fontSize: 14,
            lineHeight: 1,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={svgOnly ? '.svg,image/svg+xml' : 'image/*'}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.currentTarget.value = '';
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
}

function RowIconButton({
  children,
  onClick,
  title,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const color = danger ? '#D85258' : 'var(--editor-text)';
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 26,
        height: 26,
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-sm)',
        background: hover && !disabled ? 'var(--editor-panel-2)' : 'transparent',
        color: disabled ? 'var(--editor-text-dim)' : color,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--sans)',
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1,
        transition: 'background 120ms',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
