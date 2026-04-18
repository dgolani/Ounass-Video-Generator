import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { clamp } from './math';
import { TimelineContext, type TimelineContextValue } from './timeline';
import type { StageController } from './useStageController';

type StageProps = {
  width: number;
  height: number;
  background?: string;
  controller: StageController;
  children: ReactNode;
  /** Hide the built-in playback bar (editor uses its own chrome) */
  chromeless?: boolean;
  /** Caller-provided ref to the inner canvas element. Used by the export
   *  pipeline to rasterize the scene at its native dimensions. */
  canvasRef?: RefObject<HTMLDivElement | null>;
};

export function Stage({
  width,
  height,
  background = '#f6f4ef',
  controller,
  chromeless = false,
  children,
  canvasRef,
}: StageProps) {
  const { time, setTime, playing, togglePlay, reset, duration } = controller;
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [scale, setScale] = useState(1);

  const stageRef = useRef<HTMLDivElement | null>(null);

  // Auto-scale to fit the wrapping container
  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = chromeless ? 0 : 44;
      const s = Math.min(
        el.clientWidth / width,
        (el.clientHeight - barH) / height,
      );
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height, chromeless]);

  const displayTime = hoverTime != null ? hoverTime : time;

  const ctxValue = useMemo<TimelineContextValue>(
    () => ({
      time: displayTime,
      duration,
      playing,
      setTime,
      setPlaying: controller.setPlaying,
    }),
    [displayTime, duration, playing, setTime, controller.setPlaying],
  );

  return (
    <div
      ref={stageRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'transparent',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <div
          ref={canvasRef}
          style={{
            width,
            height,
            background,
            position: 'relative',
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            flexShrink: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          <TimelineContext.Provider value={ctxValue}>
            {children}
          </TimelineContext.Provider>
        </div>
      </div>

      {!chromeless && (
        <PlaybackBar
          time={displayTime}
          duration={duration}
          playing={playing}
          onPlayPause={togglePlay}
          onReset={reset}
          onSeek={(t) => setTime(t)}
          onHover={(t) => setHoverTime(t)}
        />
      )}
    </div>
  );
}

type PlaybackBarProps = {
  time: number;
  duration: number;
  playing: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onSeek: (t: number) => void;
  onHover: (t: number | null) => void;
};

export function PlaybackBar({
  time,
  duration,
  playing,
  onPlayPause,
  onReset,
  onSeek,
  onHover,
}: PlaybackBarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const timeFromEvent = useCallback(
    (e: { clientX: number }) => {
      const rect = trackRef.current!.getBoundingClientRect();
      const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      return x * duration;
    },
    [duration],
  );

  const onTrackMove = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) onSeek(t);
    else onHover(t);
  };

  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };

  const onTrackDown = (e: React.MouseEvent) => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };

  useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t: number) => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';
  const timeStyle: CSSProperties = {
    fontFamily: mono,
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
    width: 64,
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        background: 'rgba(20,20,20,0.92)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        width: '100%',
        maxWidth: 680,
        alignSelf: 'center',
        borderRadius: 8,
        color: '#f6f4ef',
        fontFamily: 'Inter, system-ui, sans-serif',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <IconButton onClick={onReset} title="Return to start (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 2v10M12 2L5 7l7 5V2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </IconButton>
      <IconButton onClick={onPlayPause} title="Play/pause (space)">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="3" height="10" fill="currentColor" />
            <rect x="8" y="2" width="3" height="10" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2l9 5-9 5V2z" fill="currentColor" />
          </svg>
        )}
      </IconButton>

      <div style={{ ...timeStyle, textAlign: 'right', color: '#f6f4ef' }}>
        {fmt(time)}
      </div>

      <div
        ref={trackRef}
        onMouseMove={onTrackMove}
        onMouseLeave={onTrackLeave}
        onMouseDown={onTrackDown}
        style={{
          flex: 1,
          height: 22,
          position: 'relative',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 4,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: `${pct}%`,
            height: 4,
            background: 'var(--editor-accent, oklch(72% 0.12 250))',
            borderRadius: 2,
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
          }}
        />
      </div>

      <div
        style={{
          ...timeStyle,
          textAlign: 'left',
          color: 'rgba(246,244,239,0.55)',
        }}
      >
        {fmt(duration)}
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        color: '#f6f4ef',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 120ms',
      }}
    >
      {children}
    </button>
  );
}
