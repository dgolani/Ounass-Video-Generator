import {
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

// ── Button ──────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
};

export function Button({
  variant = 'secondary',
  size = 'md',
  style,
  children,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const pad = size === 'sm' ? '8px 14px' : '12px 20px';
  const fontSize = size === 'sm' ? 12 : 13;

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: hover ? '#B07F5C' : 'var(--editor-accent)',
      color: '#0A0A0A',
      border: '1px solid var(--editor-accent)',
    },
    secondary: {
      background: hover ? 'var(--editor-panel-2)' : 'transparent',
      color: 'var(--editor-text)',
      border: '1px solid var(--editor-border)',
    },
    ghost: {
      background: hover ? 'var(--editor-panel-2)' : 'transparent',
      color: 'var(--editor-text-dim)',
      border: '1px solid transparent',
    },
    danger: {
      background: hover ? '#B01F24' : 'transparent',
      color: hover ? '#fff' : '#D85258',
      border: '1px solid #6E1D21',
    },
  };

  return (
    <button
      {...rest}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: pad,
        fontFamily: 'var(--sans)',
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: 'var(--r-md)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        transition: 'background 120ms, color 120ms, border-color 120ms',
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Field (label wrapper) ───────────────────────────────────────────────
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--editor-text-dim)',
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 11,
            color: 'var(--editor-text-dim)',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

// ── TextField ───────────────────────────────────────────────────────────
type TextFieldProps = InputHTMLAttributes<HTMLInputElement>;

export function TextField({ style, ...rest }: TextFieldProps) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      {...rest}
      onFocus={(e) => {
        setFocus(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocus(false);
        rest.onBlur?.(e);
      }}
      style={{
        background: 'var(--editor-panel-2)',
        color: 'var(--editor-text)',
        border: `1px solid ${focus ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
        borderRadius: 'var(--r-md)',
        padding: '10px 12px',
        fontFamily: 'var(--sans)',
        fontSize: 13,
        outline: 'none',
        transition: 'border-color 120ms',
        width: '100%',
        ...style,
      }}
    />
  );
}

// ── Textarea ────────────────────────────────────────────────────────────
export function Textarea({
  style,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      {...rest}
      onFocus={(e) => {
        setFocus(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocus(false);
        rest.onBlur?.(e);
      }}
      style={{
        background: 'var(--editor-panel-2)',
        color: 'var(--editor-text)',
        border: `1px solid ${focus ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
        borderRadius: 'var(--r-md)',
        padding: '10px 12px',
        fontFamily: 'var(--sans)',
        fontSize: 13,
        outline: 'none',
        transition: 'border-color 120ms',
        width: '100%',
        minHeight: 72,
        resize: 'vertical',
        ...style,
      }}
    />
  );
}

// ── ColorField ──────────────────────────────────────────────────────────
export function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
      <label
        style={{
          width: 40,
          height: 36,
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--editor-border)',
          background: value,
          position: 'relative',
          cursor: 'pointer',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </label>
      <TextField
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
      />
    </div>
  );
}

// ── Section header ──────────────────────────────────────────────────────
export function Section({ label }: { label: string }) {
  return (
    <div
      style={{
        marginTop: 24,
        marginBottom: 4,
        paddingBottom: 8,
        borderBottom: '1px solid var(--editor-border)',
        fontFamily: 'var(--sans)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--editor-accent)',
      }}
    >
      {label}
    </div>
  );
}

// ── Stack (flex column w/ gap) ──────────────────────────────────────────
export function Stack({
  children,
  gap = 12,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap, ...style }}
    >
      {children}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--s-8)',
        textAlign: 'center',
        color: 'var(--editor-text-dim)',
        minHeight: 320,
        gap: 16,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 28,
          fontWeight: 300,
          color: 'var(--editor-text)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </div>
      {body && (
        <div style={{ fontFamily: 'var(--sans)', fontSize: 14, maxWidth: 420 }}>
          {body}
        </div>
      )}
      {action}
    </div>
  );
}
