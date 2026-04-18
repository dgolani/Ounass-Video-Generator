import { useState, type CSSProperties } from 'react';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  style?: CSSProperties;
  /** Tight mode: render in a compact width for top-bar use */
  compact?: boolean;
};

export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  suffix = '',
  style,
  compact = false,
}: Props) {
  const [hover, setHover] = useState(false);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: compact ? '4px 10px' : '8px 12px',
        borderRadius: 'var(--r-md)',
        border: `1px solid ${hover ? 'var(--editor-border)' : 'transparent'}`,
        background: hover ? 'var(--editor-panel-2)' : 'transparent',
        transition: 'border-color 120ms, background 120ms',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: compact ? 120 : 160,
          height: 4,
          background: 'var(--editor-border)',
          borderRadius: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            height: '100%',
            width: `${pct}%`,
            background: 'var(--editor-accent)',
            borderRadius: 2,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            inset: -8,
            width: '100%',
            height: 20,
            margin: 0,
            opacity: 0,
            cursor: 'pointer',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${pct}%`,
            top: '50%',
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            background: '#fff',
            borderRadius: 6,
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--editor-text)',
          fontVariantNumeric: 'tabular-nums',
          minWidth: 40,
          textAlign: 'right',
        }}
      >
        {step < 1 ? value.toFixed(1) : value}
        {suffix}
      </span>
    </div>
  );
}
