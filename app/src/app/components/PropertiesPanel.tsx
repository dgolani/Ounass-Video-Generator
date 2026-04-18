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
import type { FieldDescriptor } from '../../templates/fields';
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
};

export function PropertiesPanel({ fields, value, onChange, compact }: Props) {
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
          return (
            <div key={i} style={{ marginTop: 16 }}>
              <Field label={field.label}>
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
          return (
            <div key={i} style={{ marginTop: 16 }}>
              <Field label={field.label} hint={field.hint}>
                <ImageDropZone
                  url={url}
                  onImage={(dataURL) => set(dataURL)}
                  onClear={() => set('')}
                  aspectRatio={field.aspectRatio ?? 1}
                  size="large"
                />
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
}: {
  field: Extract<FieldDescriptor, { kind: 'productList' }>;
  products: ProductShape[];
  onChange: (next: ProductShape[]) => void;
}) {
  const min = field.minProducts ?? 1;
  const max = field.maxProducts ?? 20;
  const imagePath = field.imagePath ?? 'src';

  const atMax = products.length >= max;
  const atMin = products.length <= min;

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

  return (
    <div style={{ marginTop: 16 }}>
      <Stack gap={10}>
        {products.map((product, idx) => (
          <ProductRow
            key={(product.id as string) ?? idx}
            index={idx}
            total={products.length}
            product={product}
            productFields={field.productFields}
            imagePath={imagePath}
            atMin={atMin}
            onChange={(next) => updateAt(idx, next)}
            onRemove={() => removeAt(idx)}
            onMoveUp={() => move(idx, -1)}
            onMoveDown={() => move(idx, 1)}
          />
        ))}

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
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  total: number;
  product: ProductShape;
  productFields: { path: string; label: string; kind: 'text' }[];
  imagePath: string;
  atMin: boolean;
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
          {productFields.map((pf) => (
            <TextField
              key={pf.path}
              value={String(product[pf.path] ?? '')}
              onChange={(e) =>
                onChange({ ...product, [pf.path]: e.target.value })
              }
              placeholder={pf.label}
              style={{ padding: '6px 10px', fontSize: 12 }}
            />
          ))}
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
