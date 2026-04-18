import { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/primitives';
import {
  downloadBlob,
  exportVideoToMP4,
  type ExportProgress,
} from '../../lib/export';
import type { StageController } from '../../engine';
import { getMusicTrack, resolveAudioUrl } from '../../lib/musicLibrary';

type Props = {
  open: boolean;
  onClose: () => void;
  projectName: string;
  canvasEl: HTMLElement | null;
  controller: StageController;
  width: number;
  height: number;
  duration: number;
  backgroundTrackId: string | null;
  musicVolume: number;
  musicAnchorVideoTime: number;
  musicTrimStartSec: number;
  musicEndVideoTime: number;
};

type Phase = 'idle' | 'running' | 'done' | 'error';

export function ExportModal({
  open,
  onClose,
  projectName,
  canvasEl,
  controller,
  width,
  height,
  duration,
  backgroundTrackId,
  musicVolume,
  musicAnchorVideoTime,
  musicTrimStartSec,
  musicEndVideoTime,
}: Props) {
  const exportMusicTrack = getMusicTrack(backgroundTrackId);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset when modal closes
      setPhase('idle');
      setProgress(null);
      setError(null);
      setResultBlob(null);
      abortRef.current?.abort();
    }
  }, [open]);

  const start = async () => {
    if (!canvasEl) {
      setError('Canvas not ready. Try again.');
      setPhase('error');
      return;
    }
    setPhase('running');
    setError(null);
    setResultBlob(null);
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const track = getMusicTrack(backgroundTrackId);
      if (backgroundTrackId && musicVolume >= 0.001 && !track) {
        setError(
          'This project references a track that is not in the app catalog. Pick a bundled track in the timeline.',
        );
        setPhase('error');
        return;
      }
      const audioUrl =
        track && musicVolume >= 0.001 ? resolveAudioUrl(track.src) : null;

      const blob = await exportVideoToMP4({
        canvasEl,
        controller,
        width,
        height,
        duration,
        audioUrl,
        audioVolume: musicVolume,
        musicAnchorVideoTime,
        musicTrimStartSec,
        musicEndVideoTime,
        onProgress: setProgress,
        signal: abort.signal,
      });
      setResultBlob(blob);
      setPhase('done');
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') {
        setPhase('idle');
      } else {
        console.error('[Export] failed:', e);
        const msg =
          e instanceof Error && e.message
            ? e.message
            : typeof e === 'string' && e
              ? e
              : JSON.stringify(e) || 'Export failed (unknown error)';
        setError(msg);
        setPhase('error');
      }
    }
  };

  const cancel = () => abortRef.current?.abort();

  const filename = `${projectName.replace(/[^A-Za-z0-9-_]+/g, '-').toLowerCase()}.mp4`;

  if (!open) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && phase !== 'running' && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,5,5,0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--sans)',
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: '92%',
          background: 'var(--editor-panel)',
          border: '1px solid var(--editor-border)',
          borderRadius: 'var(--r-lg)',
          padding: '32px 36px',
          boxShadow: 'var(--shadow-editor)',
          color: 'var(--editor-text)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--editor-accent)',
            marginBottom: 8,
          }}
        >
          Export
        </div>
        <h2
          style={{
            fontFamily: 'var(--serif)',
            fontWeight: 300,
            fontSize: 28,
            letterSpacing: '-0.01em',
            margin: '0 0 20px',
          }}
        >
          {phase === 'done' ? 'Ready to download' : 'Render as MP4'}
        </h2>

        {phase === 'idle' && (
          <>
            <p
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--editor-text-dim)',
                margin: '0 0 8px',
              }}
            >
              Renders the canvas frame-by-frame, then encodes to H.264 MP4
              (yuv420p, faststart). IG / TikTok / YouTube upload-ready.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '6px 16px',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--editor-text-dim)',
                margin: '16px 0 20px',
                padding: '12px 14px',
                background: 'var(--editor-panel-2)',
                borderRadius: 'var(--r-md)',
              }}
            >
              <span>Size</span>
              <span>
                {width} × {height}
              </span>
              <span>Duration</span>
              <span>{duration.toFixed(1)}s</span>
              <span>Frames</span>
              <span>{Math.ceil(duration * 30)} @ 30 fps</span>
              <span>Engine</span>
              <span>html-to-image → ffmpeg.wasm</span>
            </div>

            <div
              style={{
                marginBottom: 20,
                padding: '12px 14px',
                background: 'var(--editor-panel-2)',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--editor-border)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--editor-accent)',
                  marginBottom: 8,
                }}
              >
                Audio (from editor)
              </div>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--sans)',
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: 'var(--editor-text-dim)',
                }}
              >
                {exportMusicTrack && musicVolume >= 0.001 ? (
                  <>
                    <strong style={{ color: 'var(--editor-text)' }}>{exportMusicTrack.label}</strong>
                    <br />
                    Volume {(musicVolume * 100).toFixed(0)}% · Clip{' '}
                    {musicAnchorVideoTime.toFixed(1)}–{musicEndVideoTime.toFixed(1)}s · File in{' '}
                    {musicTrimStartSec.toFixed(1)}s
                  </>
                ) : backgroundTrackId && musicVolume >= 0.001 ? (
                  <>
                    Unknown track id — pick a bundled track in the timeline so export can find the
                    file.
                  </>
                ) : (
                  <>No music — add a track in the timeline below the canvas.</>
                )}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={start}>
                Start export
              </Button>
            </div>
          </>
        )}

        {phase === 'running' && (
          <RunningView progress={progress} onCancel={cancel} />
        )}

        {phase === 'done' && resultBlob && (
          <>
            <div
              style={{
                padding: '14px 16px',
                marginBottom: 20,
                background: 'var(--editor-panel-2)',
                border: '1px solid var(--editor-border)',
                borderRadius: 'var(--r-md)',
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: 'var(--editor-text)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{filename}</span>
              <span style={{ color: 'var(--editor-text-dim)' }}>
                {(resultBlob.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => downloadBlob(resultBlob, filename)}
              >
                Download MP4
              </Button>
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            <p
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 13,
                lineHeight: 1.6,
                color: '#D85258',
                margin: '0 0 24px',
              }}
            >
              {error ?? 'Something went wrong.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" onClick={start}>
                Retry
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RunningView({
  progress,
  onCancel,
}: {
  progress: ExportProgress | null;
  onCancel: () => void;
}) {
  const label =
    progress?.stage === 'loading'
      ? progress.message
      : progress?.stage === 'fonts'
        ? progress.message
        : progress?.stage === 'rendering'
          ? `Rendering frame ${progress.frame} of ${progress.total}`
          : progress?.stage === 'loading_audio'
            ? progress.message
            : progress?.stage === 'encoding'
              ? progress.message
              : 'Starting…';

  const pct =
    progress?.stage === 'rendering'
      ? (progress.frame / progress.total) * 100
      : progress?.stage === 'loading_audio'
        ? 92
        : progress?.stage === 'encoding'
          ? 100
          : progress?.stage === 'loading' || progress?.stage === 'fonts'
            ? 5
            : 0;

  return (
    <>
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 13,
          color: 'var(--editor-text-dim)',
          marginBottom: 10,
          minHeight: 20,
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: 4,
          background: 'var(--editor-border)',
          borderRadius: 2,
          overflow: 'hidden',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--editor-accent)',
            transition: 'width 200ms',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}
