// Project-background settings popover — anchors next to the audio
// mix button on the editor's timeline dock. Mirrors the audio mix's
// visual treatment exactly: same trigger pill style, same popover
// chrome, same stepper UI for the trim. Unique content:
//
//   - DIM slider (always present — opacity of the black plane over
//     the bg, parity with how `videoDim` worked in the legacy Reel
//     template).
//   - SOURCE FILE TRIM stepper + helper text (video kind only —
//     image bg is static, no in-point to scrub).
//
// Trigger button is visible only when a project background is set.
// When dismissed (outside click / Esc), the popover unmounts via the
// effect in EditorTimelineDock that gates `bgPanelOpen`.

import {
  type CSSProperties,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Slider } from '../../ui/Slider';
import type { ProjectBackground } from '../../store/types';

const PANEL_W = 292;
const PANEL_Z = 9400;
const BG_BRONZE = '#B87253';
const BG_BRONZE_DIM = 'rgba(184, 114, 83, 0.28)';

const stepperBtnCompact: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)',
  color: 'var(--editor-text)',
  cursor: 'pointer',
  fontSize: 16,
  fontWeight: 500,
};

type Props = {
  triggerRef: RefObject<HTMLButtonElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  onToggle: () => void;
  panelBox: { top: number; left: number } | null;
  background: ProjectBackground;
  onChange: (next: ProjectBackground) => void;
};

export function BackgroundSettingsButton({
  triggerRef,
  panelRef,
  open,
  onToggle,
  panelBox,
  background,
  onChange,
}: Props) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        data-timeline-no-seek
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Background settings"
        title="Background settings"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: `1px solid ${open ? BG_BRONZE_DIM : 'var(--editor-border)'}`,
          background: open
            ? `linear-gradient(180deg, rgba(184,114,83,0.16) 0%, rgba(184,114,83,0.05) 100%)`
            : 'var(--editor-panel-2)',
          color: open ? BG_BRONZE : 'var(--editor-text-dim)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: open
            ? '0 0 20px rgba(184,114,83,0.16), inset 0 1px 0 rgba(255,255,255,0.06)'
            : 'inset 0 1px 0 rgba(255,255,255,0.04)',
          transition: 'border-color 180ms, background 180ms, color 180ms, box-shadow 180ms',
        }}
      >
        <BackgroundIcon />
      </button>
      {open && panelBox
        ? createPortal(
            <div
              ref={panelRef}
              data-timeline-no-seek
              role="dialog"
              aria-label="Background settings"
              style={{
                position: 'fixed',
                top: panelBox.top,
                left: panelBox.left,
                width: PANEL_W,
                maxHeight: 'min(72vh, calc(100vh - 16px))',
                overflowY: 'auto',
                zIndex: PANEL_Z,
                padding: '18px 18px 16px',
                borderRadius: 14,
                border: `1px solid rgba(184,114,83,0.22)`,
                background: 'linear-gradient(165deg, #1E1E24 0%, #121216 55%, #0E0E12 100%)',
                boxShadow:
                  '0 28px 56px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(184,114,83,0.10) inset',
                color: 'var(--editor-text)',
                fontFamily: 'var(--sans)',
              }}
            >
              <PanelHeader background={background} />
              <DimSection
                value={background.dim}
                onChange={(dim) =>
                  onChange({ ...background, dim } as ProjectBackground)
                }
              />
              {background.kind === 'video' ? (
                <TrimSection
                  trimStartSec={background.trimStartSec}
                  onChange={(trim) =>
                    onChange({ ...background, trimStartSec: trim })
                  }
                />
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function PanelHeader({ background }: { background: ProjectBackground }) {
  return (
    <>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: BG_BRONZE,
          marginBottom: 4,
        }}
      >
        Background
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--editor-text)',
          lineHeight: 1.35,
          marginBottom: 16,
          paddingBottom: 14,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={background.kind === 'video' ? background.src : 'Uploaded image'}
      >
        {background.kind === 'video'
          ? background.src || 'Untitled video'
          : 'Uploaded image'}
      </div>
    </>
  );
}

function DimSection({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--editor-text-dim)',
          marginBottom: 8,
        }}
      >
        Dim
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 18,
        }}
      >
        <span
          style={{
            fontSize: 15,
            opacity: value < 0.05 ? 0.45 : 1,
            color: value < 0.05 ? 'var(--editor-text-dim)' : BG_BRONZE,
          }}
          aria-hidden
        >
          ◐
        </span>
        <Slider
          compact
          style={{
            flex: 1,
            minWidth: 0,
            padding: '4px 8px',
            border: 'none',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 8,
          }}
          value={Math.round(value * 100)}
          min={0}
          max={85}
          step={1}
          suffix="%"
          onChange={(v) => onChange(Math.min(0.85, Math.max(0, v / 100)))}
        />
      </div>
    </>
  );
}

function TrimSection({
  trimStartSec,
  onChange,
}: {
  trimStartSec: number;
  onChange: (v: number) => void;
}) {
  return (
    <>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--editor-text-dim)',
          marginBottom: 8,
        }}
      >
        Source file trim
      </div>
      <p
        style={{
          margin: '0 0 10px',
          fontSize: 10,
          lineHeight: 1.45,
          color: 'rgba(255,255,255,0.42)',
        }}
      >
        <strong style={{ color: BG_BRONZE }}>Press and hold</strong> on the
        timeline clip, then drag to scrub the in-point in the source file
        (the on-timeline clip stays put). Steppers nudge ±0.25s.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          title="Earlier in file (−0.25s)"
          onClick={() => onChange(Math.max(0, trimStartSec - 0.25))}
          style={stepperBtnCompact}
        >
          −
        </button>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 13,
            minWidth: 48,
            textAlign: 'center',
            color: 'var(--editor-text)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {trimStartSec.toFixed(1)}s
        </span>
        <button
          type="button"
          title="Later in file (+0.25s)"
          onClick={() => onChange(trimStartSec + 0.25)}
          style={stepperBtnCompact}
        >
          +
        </button>
      </div>
    </>
  );
}

function BackgroundIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 14l3-4 3 3 2-2 2 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
    </svg>
  );
}
