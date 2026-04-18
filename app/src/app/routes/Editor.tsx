import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { quickHash } from '../../lib/quickHash';
import { useNavigate, useParams } from 'react-router-dom';
import { Stage, useStageController } from '../../engine';
import { useProject } from '../../store/projects';
import {
  editablesEqual,
  editableToPatch,
  projectToEditable,
  type EditableState,
} from '../../store/editableState';
import { getTemplate } from '../../templates/registry';
import { Button } from '../../ui/primitives';
import { EditorBrandPanel, splitEditorFields } from '../components/EditorBrandPanel';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { ExportModal } from '../components/ExportModal';
import { EditorTimelineDock } from '../components/EditorTimelineDock';
import { useEditorMusicPreview } from '../hooks/useEditorMusicPreview';
import { useFilmstripCapture } from '../hooks/useFilmstripCapture';
import { getMusicTrack, resolveAudioUrl } from '../../lib/musicLibrary';
import { useHistory } from '../../lib/useHistory';
import { activeSceneIdAtLocalTime } from '../../lib/activeSceneAtTime';

/** Clamp music anchor/end against the current duration. Called on every
 *  timeline patch so a shorter video automatically pulls the music bed
 *  inside bounds (was a separate useEffect before; inlining avoids a
 *  double-save and keeps the history stack clean). */
function normalizeEditable(e: EditableState): EditableState {
  const d = e.duration;
  const maxAnchor = Math.max(0, d - 0.05);
  const anchor = Math.min(Math.max(0, e.musicAnchorVideoTime), maxAnchor);
  const minEnd = Math.min(d, anchor + 0.15);
  const end = Math.min(d, Math.max(minEnd, e.musicEndVideoTime));
  if (
    anchor === e.musicAnchorVideoTime &&
    end === e.musicEndVideoTime
  ) {
    return e;
  }
  return { ...e, musicAnchorVideoTime: anchor, musicEndVideoTime: end };
}

const EMPTY_EDITABLE: EditableState = {
  props: undefined,
  aspectIndex: 0,
  duration: 9,
  videoClipStartSec: 0,
  backgroundTrackId: null,
  musicVolume: 0.35,
  musicAnchorVideoTime: 0,
  musicTrimStartSec: 0,
  musicEndVideoTime: 9,
};

export function Editor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { project, save } = useProject(id);

  // Single history stack for everything the user can mutate in the editor:
  // template props + aspect + duration + all music/timeline fields.
  // Undo now rolls back timeline drags alongside text edits.
  const {
    value: editable,
    set: setEditable,
    reset: resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<EditableState>(
    project ? projectToEditable(project) : EMPTY_EDITABLE,
  );

  const [localName, setLocalName] = useState<string>(project?.name ?? '');
  const [savedHint, setSavedHint] = useState<string>('');
  const [exportOpen, setExportOpen] = useState(false);
  /** Expanded preview: timeline collapses with transition for a larger stage */
  const [cinemaMode, setCinemaMode] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoTimeRef = useRef(0);
  const getVideoTime = useCallback(() => videoTimeRef.current, []);

  // Rehydrate history when switching projects.
  useEffect(() => {
    if (project) {
      resetHistory(projectToEditable(project));
      setLocalName(project.name);
    }
  }, [project?.id]);

  // Debounced autosave: whenever the editable state diverges from what's
  // in the project store, push a patch. Works identically for prop edits,
  // timeline drags, and undo/redo.
  useEffect(() => {
    if (!project) return;
    const projectEditable = projectToEditable(project);
    if (editablesEqual(editable, projectEditable)) return;
    const h = setTimeout(() => {
      const res = save(editableToPatch(editable));
      if (res.ok) setSavedHint('Saved');
      else if (res.error === 'quota') setSavedHint('Storage full — drop an image or two');
      setTimeout(() => setSavedHint(''), 2400);
    }, 400);
    return () => clearTimeout(h);
  }, [editable, project, save]);

  // Commit name on blur (name stays outside history by design — it's
  // edited via a single blur-commit flow, not a drag/typing burst).
  const commitName = () => {
    if (!project) return;
    if (localName.trim() && localName !== project.name) {
      save({ name: localName.trim() });
    }
  };

  // ── Setters exposed to children (all route through the unified history)
  const setLocalProps = useCallback(
    (nextProps: unknown) => {
      setEditable((prev) => ({ ...prev, props: nextProps }));
    },
    [setEditable],
  );

  const onTimelinePatch = useCallback(
    (patch: Partial<EditableState>) => {
      setEditable((prev) => normalizeEditable({ ...prev, ...patch }));
    },
    [setEditable],
  );

  const onAspectChange = useCallback(
    (i: number) => {
      setEditable((prev) => ({ ...prev, aspectIndex: i }));
    },
    [setEditable],
  );

  const template = project ? getTemplate(project.templateId) : null;
  const aspectIndex = editable.aspectIndex;
  const aspect = template?.meta.aspects[aspectIndex];
  const duration = editable.duration;
  const defaultDuration = template?.meta.defaultDuration ?? 9;
  const timeScale = duration / defaultDuration;
  const localProps = editable.props;

  const controller = useStageController({
    duration,
    loop: true,
    autoplay: false,
    persistKey: project ? `project:${project.id}` : undefined,
  });

  const activeSceneId = useMemo(() => {
    if (!template?.meta.scenes?.length) return null;
    return activeSceneIdAtLocalTime(
      template.meta.scenes,
      controller.time,
      duration,
      timeScale,
    );
  }, [template, controller.time, duration, timeScale]);

  const { leftPaneFields, rightPaneFields } = useMemo(() => {
    if (!template) return { leftPaneFields: [], rightPaneFields: [] };
    return splitEditorFields(template.fields);
  }, [template]);

  /** Scene ranges in local video time (0…duration), scaled when duration ≠ template default */
  const scaledVideoScenes = useMemo(() => {
    if (!template) return [];
    return template.meta.scenes.map((s) => ({
      ...s,
      start: s.start * timeScale,
      end: s.end * timeScale,
    }));
  }, [template, timeScale]);

  const filmstripRevision = useMemo(() => {
    if (!project || !aspect) return '';
    const raw = JSON.stringify(localProps);
    const fp = raw.length > 14000 ? raw.slice(0, 14000) : raw;
    return `${project.id}-${aspect.width}x${aspect.height}-${duration}-${editable.videoClipStartSec}-${quickHash(fp)}`;
  }, [project?.id, aspect, duration, editable.videoClipStartSec, localProps]);

  const filmstripCanvasBg =
    (localProps as { colors?: { background?: string } })?.colors?.background ?? '#0A0A0A';

  const { images: filmstripImages, status: filmstripStatus, error: filmstripError } =
    useFilmstripCapture({
      canvasRef,
      duration,
      controller,
      revision: filmstripRevision,
      aspectW: aspect?.width ?? 1080,
      aspectH: aspect?.height ?? 1920,
      enabled: Boolean(filmstripRevision),
      captureBackground: filmstripCanvasBg,
    });

  videoTimeRef.current = controller.time;

  useEffect(() => {
    if (!cinemaMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setCinemaMode(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [cinemaMode]);

  // Nudge keys: ',' / '.' = ±1 frame, Shift for ±10 frames.
  // Scoped to the editor route. Ignored when focus is in a text input.
  useEffect(() => {
    const FRAME = 1 / 30;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '.' && e.key !== ',' && e.key !== '>' && e.key !== '<') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      const forward = e.key === '.' || e.key === '>';
      const step = (e.shiftKey ? 10 : 1) * FRAME * (forward ? 1 : -1);
      controller.setTime((t) => {
        const next = t + step;
        return Math.max(0, Math.min(duration, next));
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller, duration]);

  const musicTrack = project ? getMusicTrack(editable.backgroundTrackId) : null;
  const musicSrc =
    musicTrack && editable.musicVolume >= 0.001
      ? resolveAudioUrl(musicTrack.src)
      : null;

  useEditorMusicPreview({
    audioRef,
    src: musicSrc,
    enabled: Boolean(musicSrc),
    volume: editable.musicVolume,
    anchorVideoTime: editable.musicAnchorVideoTime,
    trimStartSec: editable.musicTrimStartSec,
    musicEndVideoTime: editable.musicEndVideoTime,
    playing: controller.playing,
    getVideoTime,
  });

  if (!project || !template || !aspect) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--editor-text-dim)',
          background: 'var(--editor-bg)',
          fontFamily: 'var(--sans)',
        }}
      >
        {project === null ? 'Project not found.' : 'Loading…'}
      </div>
    );
  }

  const Scene = template.Scene;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '56px 1fr',
        gridTemplateColumns: '288px 1fr 360px',
        gridTemplateAreas: `
          "top top top"
          "left center right"
        `,
        height: '100vh',
        background: 'var(--editor-bg)',
        color: 'var(--editor-text)',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          gridArea: 'top',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          borderBottom: '1px solid var(--editor-border)',
          background: 'var(--editor-panel)',
        }}
      >
        <Button variant="ghost" size="sm" onClick={() => nav('/')}>
          ← Projects
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 220 }}>
          <input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            style={{
              background: 'transparent',
              border: 0,
              outline: 'none',
              fontFamily: 'var(--serif)',
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: '-0.01em',
              color: 'var(--editor-text)',
              width: '100%',
              maxWidth: 320,
              padding: '6px 8px',
              borderRadius: 4,
            }}
          />
          {savedHint && (
            <span
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 11,
                color:
                  savedHint.startsWith('Storage') ? '#D85258' : 'var(--success)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {savedHint}
            </span>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Undo/redo — covers props AND timeline mutations now */}
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
          >
            ↶
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
          >
            ↷
          </Button>
        </div>

        {/* Aspect switcher */}
        <AspectSwitcher
          aspects={template.meta.aspects}
          index={aspectIndex}
          onChange={onAspectChange}
        />

        <Button variant="primary" size="sm" onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </div>

      {/* Left pane: logo, products, colors */}
      <div
        style={{
          gridArea: 'left',
          borderRight: '1px solid var(--editor-border)',
          background: 'var(--editor-panel)',
          overflow: 'auto',
        }}
      >
        <EditorBrandPanel
          leftPaneFields={leftPaneFields}
          value={localProps}
          onChange={setLocalProps}
          activeSceneId={activeSceneId}
        />
      </div>

      {/* Center pane: canvas + playback bar */}
      <div
        style={{
          gridArea: 'center',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--editor-bg)',
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            transition: 'box-shadow 0.55s cubic-bezier(0.33, 1, 0.68, 1)',
            boxShadow: cinemaMode
              ? 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 80px rgba(0,0,0,0.35)'
              : 'none',
          }}
        >
          <Stage
            width={aspect.width}
            height={aspect.height}
            background={
              (localProps as { colors?: { background?: string } })?.colors
                ?.background ?? '#0A0A0A'
            }
            controller={controller}
            chromeless
            canvasRef={canvasRef}
            compositionStartSec={editable.videoClipStartSec}
            onChromelessCanvasActivate={() => setCinemaMode(true)}
            onChromelessLetterboxPointerDown={() => setCinemaMode((c) => !c)}
          >
            <Scene
              props={localProps}
              timeScale={timeScale}
              width={aspect.width}
              height={aspect.height}
            />
          </Stage>
        </div>
        <div
          style={{
            flexShrink: 0,
            maxHeight: cinemaMode ? 132 : 560,
            overflow: 'hidden',
            paddingTop: cinemaMode ? 6 : 12,
            paddingBottom: cinemaMode ? 6 : 12,
            paddingLeft: cinemaMode ? 16 : 24,
            paddingRight: cinemaMode ? 16 : 24,
            borderTop: '1px solid var(--editor-border)',
            background: 'var(--editor-panel)',
            transition:
              'max-height 0.52s cubic-bezier(0.32, 0.72, 0, 1), padding 0.48s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <EditorTimelineDock
            duration={duration}
            videoClipStartSec={editable.videoClipStartSec}
            videoScenes={scaledVideoScenes}
            time={controller.time}
            playing={controller.playing}
            onSeek={controller.setTime}
            filmstripImages={filmstripImages}
            filmstripStatus={filmstripStatus}
            filmstripError={filmstripError}
            backgroundTrackId={editable.backgroundTrackId}
            musicVolume={editable.musicVolume}
            musicAnchorVideoTime={editable.musicAnchorVideoTime}
            musicTrimStartSec={editable.musicTrimStartSec}
            musicEndVideoTime={editable.musicEndVideoTime}
            onPatch={onTimelinePatch}
            onPlayPause={controller.togglePlay}
            onReset={controller.reset}
            cinemaMode={cinemaMode}
            onExitCinema={() => setCinemaMode(false)}
          />
          {musicTrack && editable.musicVolume >= 0.001 ? (
            <audio
              ref={audioRef}
              key={editable.backgroundTrackId ?? ''}
              src={resolveAudioUrl(musicTrack.src)}
              preload="auto"
            />
          ) : null}
        </div>
      </div>

      {/* Right pane: properties panel */}
      <div
        style={{
          gridArea: 'right',
          borderLeft: '1px solid var(--editor-border)',
          background: 'var(--editor-panel)',
          overflow: 'auto',
        }}
      >
        <PropertiesPanel
          fields={rightPaneFields}
          value={localProps}
          onChange={setLocalProps}
          activeSceneId={activeSceneId}
        />
      </div>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        projectName={project.name}
        canvasEl={canvasRef.current}
        controller={controller}
        width={aspect.width}
        height={aspect.height}
        duration={duration}
        backgroundTrackId={editable.backgroundTrackId}
        musicVolume={editable.musicVolume}
        musicAnchorVideoTime={editable.musicAnchorVideoTime}
        musicTrimStartSec={editable.musicTrimStartSec}
        musicEndVideoTime={editable.musicEndVideoTime}
      />
    </div>
  );
}

function AspectSwitcher({
  aspects,
  index,
  onChange,
}: {
  aspects: { label: string; width: number; height: number }[];
  index: number;
  onChange: (i: number) => void;
}) {
  const single = aspects.length <= 1;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 2,
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-md)',
      }}
    >
      {aspects.map((a, i) => {
        const active = i === index;
        return (
          <button
            key={a.label}
            onClick={() => !single && onChange(i)}
            disabled={single}
            title={single ? 'This template supports only one aspect' : a.label}
            style={{
              padding: '4px 10px',
              fontFamily: 'var(--sans)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background: active ? 'var(--editor-accent)' : 'transparent',
              color: active ? '#0A0A0A' : 'var(--editor-text-dim)',
              border: 0,
              borderRadius: 4,
              cursor: single ? 'default' : 'pointer',
              opacity: single && !active ? 0.5 : 1,
            }}
          >
            {a.label.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}
