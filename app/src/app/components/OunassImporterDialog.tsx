// Ounass Importer dialog — modal that fetches a product by SKU from
// `https://www.ounass.ae/product/findbysku?sku=…` and lets the
// marketer pick an image (when the API returned multiple). On confirm,
// the parent receives the chosen image URL + the parsed product so it
// can write the relevant subfields into a product row.
//
// Three primary modes, driven by local state:
//
//   1. **input** — SKU entry. Default mode. Type SKU → click Import.
//   2. **fetching** — spinner while the network call is in flight.
//   3. **success** — product summary + image grid (if multiple) +
//      "Use this product" CTA.
//
//   On fetch failure (most commonly Kasada / CORS), the dialog drops
//   into a **paste** mode showing the URL to open in a new tab + a
//   textarea for the marketer to paste the JSON they see there. We
//   then re-run the same parser on the pasted JSON.
//
// Lives at the component layer (not embedded in PropertiesPanel) so
// future invocations from elsewhere — e.g. a "bulk import" tool, or
// the gallery's stock-photo picker — can reuse it without copy-paste.

import { useEffect, useState } from 'react';
import {
  fetchOunassProduct,
  parseOunassResponse,
  ounassSkuUrl,
  OunassImporterError,
  type OunassProduct,
} from '../../lib/importers/ounass';

type Mode = 'input' | 'fetching' | 'success' | 'paste';

export type OunassImporterResult = {
  product: OunassProduct;
  imageUrl: string;
};

export function OunassImporterDialog({
  initialSku,
  onClose,
  onImport,
}: {
  /** Pre-populate the SKU field. Optional — leave empty to start blank. */
  initialSku?: string;
  /** Called when the user clicks Cancel or hits Escape. */
  onClose: () => void;
  /** Called when the user clicks "Use this product". Receives the
   *  parsed product + the user-selected image URL (or empty string if
   *  no images). The parent is responsible for closing the dialog. */
  onImport: (result: OunassImporterResult) => void;
}) {
  const [mode, setMode] = useState<Mode>('input');
  const [sku, setSku] = useState(initialSku ?? '');
  const [pasteText, setPasteText] = useState('');
  const [product, setProduct] = useState<OunassProduct | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [error, setError] = useState<{
    title: string;
    detail?: string;
  } | null>(null);

  // Esc closes the dialog (matches the format drawer + theme pill UX).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmedSku = sku.trim();
  const canImport = trimmedSku.length > 0 && mode !== 'fetching';

  const handleFetch = async () => {
    if (!trimmedSku) return;
    setMode('fetching');
    setError(null);
    try {
      const result = await fetchOunassProduct(trimmedSku);
      setProduct(result);
      setSelectedImageIdx(0);
      setMode('success');
    } catch (err) {
      if (err instanceof OunassImporterError) {
        // Blocked → drop straight into paste mode (most common flow).
        // Other reasons stay on the input screen with an inline error.
        if (err.reason === 'blocked') {
          setError({
            title: err.message,
            detail: err.detail,
          });
          setMode('paste');
        } else {
          setError({ title: err.message, detail: err.detail });
          setMode('input');
        }
      } else {
        setError({
          title: 'Import failed',
          detail: err instanceof Error ? err.message : String(err),
        });
        setMode('input');
      }
    }
  };

  const handleParsePaste = () => {
    setError(null);
    let json: unknown;
    try {
      json = JSON.parse(pasteText);
    } catch (e) {
      setError({
        title: 'Could not parse JSON',
        detail: e instanceof Error ? e.message : 'Make sure you copied the entire response.',
      });
      return;
    }
    try {
      const parsed = parseOunassResponse(json, trimmedSku);
      setProduct(parsed);
      setSelectedImageIdx(0);
      setMode('success');
    } catch (err) {
      setError({
        title: err instanceof OunassImporterError ? err.message : 'Could not extract product',
        detail: err instanceof OunassImporterError ? err.detail : undefined,
      });
    }
  };

  const handleConfirm = () => {
    if (!product) return;
    const imageUrl =
      product.images.length > 0 ? product.images[selectedImageIdx] : '';
    onImport({ product, imageUrl });
  };

  return (
    <Backdrop onClose={onClose}>
      <Panel>
        <Header onClose={onClose} sku={trimmedSku} mode={mode} />

        <div style={{ padding: 18, overflow: 'auto' }}>
          {mode === 'input' && (
            <InputMode
              sku={sku}
              onSku={setSku}
              onFetch={handleFetch}
              error={error}
              canImport={canImport}
              onSwitchToPaste={() => {
                setError(null);
                setMode('paste');
              }}
            />
          )}

          {mode === 'fetching' && <FetchingMode />}

          {mode === 'paste' && (
            <PasteMode
              sku={trimmedSku}
              text={pasteText}
              onText={setPasteText}
              error={error}
              onBack={() => {
                setError(null);
                setMode('input');
              }}
            />
          )}

          {mode === 'success' && product && (
            <SuccessMode
              product={product}
              selectedImageIdx={selectedImageIdx}
              onSelectImage={setSelectedImageIdx}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 14,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            borderTop: '1px solid var(--editor-border)',
            background: 'var(--editor-panel-2)',
          }}
        >
          <FooterButton variant="ghost" onClick={onClose}>
            Cancel
          </FooterButton>
          {mode === 'input' && (
            <FooterButton
              variant="primary"
              onClick={handleFetch}
              disabled={!canImport}
            >
              Import
            </FooterButton>
          )}
          {mode === 'paste' && (
            <FooterButton
              variant="primary"
              onClick={handleParsePaste}
              disabled={pasteText.trim().length === 0}
            >
              Parse JSON
            </FooterButton>
          )}
          {mode === 'success' && (
            <FooterButton variant="primary" onClick={handleConfirm}>
              Use this product
            </FooterButton>
          )}
        </div>
      </Panel>
    </Backdrop>
  );
}

// ── Modes ─────────────────────────────────────────────────────────────

function InputMode({
  sku,
  onSku,
  onFetch,
  error,
  canImport,
  onSwitchToPaste,
}: {
  sku: string;
  onSku: (s: string) => void;
  onFetch: () => void;
  error: { title: string; detail?: string } | null;
  canImport: boolean;
  onSwitchToPaste: () => void;
}) {
  return (
    <>
      <p style={hintStyle}>
        Enter an Ounass SKU. We\u2019ll fetch the name, price, brand, and
        images directly from <code style={codeStyle}>ounass.ae</code> and pre-fill this product row.
      </p>
      <input
        autoFocus
        value={sku}
        placeholder="e.g. 219552839"
        onChange={(e) => onSku(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canImport) onFetch();
        }}
        style={inputStyle}
      />
      {error && <ErrorBlock title={error.title} detail={error.detail} />}
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--editor-text-dim)' }}>
        Network blocked you?{' '}
        <button
          type="button"
          onClick={onSwitchToPaste}
          style={linkButtonStyle}
        >
          Paste the JSON manually
        </button>{' '}
        from a tab where you opened the URL yourself.
      </div>
    </>
  );
}

function FetchingMode() {
  return (
    <div
      style={{
        padding: '32px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        color: 'var(--editor-text-dim)',
        fontSize: 13,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: '2px solid var(--editor-accent)',
          borderRightColor: 'transparent',
          animation: 'oun-imp-spin 0.8s linear infinite',
        }}
      />
      <span>Fetching from Ounass…</span>
      <style>{`@keyframes oun-imp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function PasteMode({
  sku,
  text,
  onText,
  error,
  onBack,
}: {
  sku: string;
  text: string;
  onText: (s: string) => void;
  /** Footer "Parse JSON" button drives parsing — local mode doesn't
   *  need its own action button. Receiver handles via the prop in the
   *  parent component. */
  error: { title: string; detail?: string } | null;
  onBack: () => void;
}) {
  const url = ounassSkuUrl(sku || '<sku>');
  const [copied, setCopied] = useState(false);
  return (
    <>
      <p style={hintStyle}>
        Ounass blocks server-to-server fetches behind their bot wall.
        Open the URL below in a new tab — your own browser session
        sails through — then copy the JSON and paste it here.
      </p>

      <ol style={stepsStyle}>
        <li>
          <span style={stepNumStyle}>1</span>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 6 }}>Open the URL in a new tab</div>
            <div style={urlChipStyle}>
              <code style={{ ...codeStyle, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {url}
              </code>
              <button
                type="button"
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                style={inlineActionStyle}
              >
                Open
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  } catch {
                    /* ignore */
                  }
                }}
                style={inlineActionStyle}
              >
                {copied ? 'Copied' : 'Copy URL'}
              </button>
            </div>
          </div>
        </li>
        <li>
          <span style={stepNumStyle}>2</span>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 6 }}>
              Select all (\u2318A) and copy (\u2318C) the JSON in that tab,
              then paste below
            </div>
            <textarea
              value={text}
              onChange={(e) => onText(e.target.value)}
              placeholder='{ "displayName": "...", "brand": { "name": "..." }, ... }'
              rows={9}
              style={textareaStyle}
            />
          </div>
        </li>
      </ol>

      {error && <ErrorBlock title={error.title} detail={error.detail} />}

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--editor-text-dim)' }}>
        <button type="button" onClick={onBack} style={linkButtonStyle}>
          ← Back to direct import
        </button>
      </div>
    </>
  );
}

function SuccessMode({
  product,
  selectedImageIdx,
  onSelectImage,
}: {
  product: OunassProduct;
  selectedImageIdx: number;
  onSelectImage: (idx: number) => void;
}) {
  return (
    <>
      {/* Product summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 4,
          marginBottom: 14,
          padding: '10px 12px',
          background: 'var(--editor-panel-2)',
          border: '1px solid var(--editor-border)',
          borderRadius: 'var(--r-md)',
        }}
      >
        {product.brand && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--editor-text-dim)',
            }}
          >
            {product.brand}
          </div>
        )}
        {product.name && (
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 16,
              letterSpacing: '-0.01em',
            }}
          >
            {product.name}
          </div>
        )}
        {product.price && (
          <div style={{ fontSize: 13, color: 'var(--editor-accent)' }}>
            {product.price}
          </div>
        )}
        {product.category && (
          <div style={{ fontSize: 11, color: 'var(--editor-text-dim)' }}>
            {product.category}
          </div>
        )}
      </div>

      {/* Image picker */}
      {product.images.length === 0 ? (
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(216, 82, 88, 0.08)',
            border: '1px solid rgba(216, 82, 88, 0.32)',
            borderRadius: 4,
            fontSize: 12,
            color: '#D85258',
          }}
        >
          The response contained no images. The product will be imported
          without an image; you can add one yourself in the row below.
        </div>
      ) : product.images.length === 1 ? (
        <div>
          <SectionLabel>Image</SectionLabel>
          <ImageThumb
            url={product.images[0]}
            selected={true}
            onClick={() => onSelectImage(0)}
            large
          />
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--editor-text-dim)' }}>
            Single image — auto-selected.
          </div>
        </div>
      ) : (
        <div>
          <SectionLabel>
            Pick an image ({product.images.length} returned)
          </SectionLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
              gap: 8,
            }}
          >
            {product.images.map((url, idx) => (
              <ImageThumb
                key={url}
                url={url}
                selected={idx === selectedImageIdx}
                onClick={() => onSelectImage(idx)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── Layout primitives ─────────────────────────────────────────────────

function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-label="Import from Ounass"
      style={{
        width: 480,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--editor-panel)',
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-lg)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        fontFamily: 'var(--sans)',
        fontSize: 12,
        color: 'var(--editor-text)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

function Header({
  onClose,
  sku,
  mode,
}: {
  onClose: () => void;
  sku: string;
  mode: Mode;
}) {
  return (
    <div
      style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--editor-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--editor-panel)',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 18,
            letterSpacing: '-0.01em',
          }}
        >
          Ounass Importer
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--editor-text-dim)',
            letterSpacing: '0.04em',
            marginTop: 2,
          }}
        >
          {mode === 'input' && 'Fetch product details by SKU'}
          {mode === 'fetching' && (sku ? `Fetching SKU ${sku}…` : 'Fetching…')}
          {mode === 'paste' && 'Paste the API response from your browser'}
          {mode === 'success' && (sku ? `SKU ${sku}` : 'Product preview')}
        </div>
      </div>
      <button
        type="button"
        aria-label="Close importer"
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 0,
          color: 'var(--editor-text-dim)',
          fontSize: 22,
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

function FooterButton({
  variant,
  onClick,
  disabled,
  children,
}: {
  variant: 'primary' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const isPrimary = variant === 'primary';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        background: isPrimary ? 'var(--editor-accent)' : 'transparent',
        color: isPrimary ? '#1A1208' : 'var(--editor-text)',
        border: `1px solid ${isPrimary ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
        borderRadius: 4,
        fontFamily: 'var(--sans)',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

function ImageThumb({
  url,
  selected,
  onClick,
  large,
}: {
  url: string;
  selected: boolean;
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{
        position: 'relative',
        padding: 0,
        width: large ? '100%' : undefined,
        aspectRatio: '3/4',
        background: 'var(--editor-panel-2)',
        border: `2px solid ${selected ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 140ms',
      }}
    >
      <img
        src={url}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        // Don't break the dialog if a CDN URL fails — show a soft
        // placeholder bg + the image is just absent.
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.opacity = '0';
        }}
      />
      {selected && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--editor-accent)',
            color: '#1A1208',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✓
        </span>
      )}
    </button>
  );
}

function ErrorBlock({ title, detail }: { title: string; detail?: string }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: '10px 12px',
        background: 'rgba(216, 82, 88, 0.08)',
        border: '1px solid rgba(216, 82, 88, 0.32)',
        borderRadius: 4,
        fontSize: 12,
        color: '#D85258',
      }}
    >
      <div style={{ fontWeight: 600 }}>{title}</div>
      {detail && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            wordBreak: 'break-word',
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--editor-text-dim)',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

// Shared style objects — kept outside components so they don't re-allocate
// on every render (small perf win, also keeps JSX skim-readable).

const hintStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--editor-text-dim)',
};

const codeStyle: React.CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11,
  background: 'var(--editor-panel-2)',
  padding: '1px 6px',
  borderRadius: 3,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--editor-panel-2)',
  border: '1px solid var(--editor-border)',
  borderRadius: 4,
  color: 'var(--editor-text)',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 14,
  letterSpacing: '0.02em',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--editor-panel-2)',
  border: '1px solid var(--editor-border)',
  borderRadius: 4,
  color: 'var(--editor-text)',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11,
  lineHeight: 1.4,
  boxSizing: 'border-box',
  resize: 'vertical',
};

const stepsStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const stepNumStyle: React.CSSProperties = {
  flex: 'none',
  width: 22,
  height: 22,
  borderRadius: '50%',
  background: 'var(--editor-accent)',
  color: '#1A1208',
  fontSize: 11,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 1,
};

const urlChipStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'var(--editor-panel)',
  border: '1px solid var(--editor-border)',
  borderRadius: 4,
  padding: '4px 6px',
};

const inlineActionStyle: React.CSSProperties = {
  flex: 'none',
  padding: '3px 8px',
  background: 'var(--editor-accent)',
  color: '#1A1208',
  border: 0,
  borderRadius: 3,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const linkButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 0,
  padding: 0,
  font: 'inherit',
  color: 'var(--editor-accent)',
  textDecoration: 'underline',
  cursor: 'pointer',
};

