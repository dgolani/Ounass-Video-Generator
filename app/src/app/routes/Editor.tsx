import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PlaybackBar,
  Stage,
  useStageController,
} from '../../engine';
import { useProject } from '../../store/projects';
import { getTemplate } from '../../templates/registry';
import { Button } from '../../ui/primitives';
import { Slider } from '../../ui/Slider';
import { Outline } from '../components/Outline';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { ExportModal } from '../components/ExportModal';
import { useHistory } from '../../lib/useHistory';

export function Editor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { project, save } = useProject(id);

  const {
    value: localProps,
    set: setLocalProps,
    reset: resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<unknown>(project?.props);

  const [localName, setLocalName] = useState<string>(project?.name ?? '');
  const [savedHint, setSavedHint] = useState<string>('');
  const [exportOpen, setExportOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (project) {
      resetHistory(project.props);
      setLocalName(project.name);
    }
  }, [project?.id]);

  // Debounced autosave of props
  useEffect(() => {
    if (!project || localProps === project.props) return;
    const h = setTimeout(() => {
      const res = save({ props: localProps });
      if (res.ok) setSavedHint('Saved');
      else if (res.error === 'quota') setSavedHint('Storage full — drop an image or two');
      setTimeout(() => setSavedHint(''), 2400);
    }, 400);
    return () => clearTimeout(h);
  }, [localProps]);

  // Commit name on blur
  const commitName = () => {
    if (!project) return;
    if (localName.trim() && localName !== project.name) {
      save({ name: localName.trim() });
    }
  };

  const template = project ? getTemplate(project.templateId) : null;
  const aspectIndex = project?.aspectIndex ?? 0;
  const aspect = template?.meta.aspects[aspectIndex];
  const duration = project?.duration ?? template?.meta.defaultDuration ?? 9;
  const defaultDuration = template?.meta.defaultDuration ?? 9;
  const timeScale = duration / defaultDuration;

  const controller = useStageController({
    duration,
    loop: true,
    autoplay: true,
    persistKey: project ? `project:${project.id}` : undefined,
  });

  const scaledScenes = useMemo(() => {
    if (!template) return [];
    return template.meta.scenes.map((s) => ({
      ...s,
      start: s.start * timeScale,
      end: s.end * timeScale,
    }));
  }, [template, timeScale]);

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
        gridTemplateColumns: '240px 1fr 360px',
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

        {/* Undo/redo */}
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
          onChange={(i) => save({ aspectIndex: i })}
        />

        {/* Duration slider */}
        <Slider
          compact
          value={duration}
          min={5}
          max={20}
          step={0.5}
          suffix="s"
          onChange={(d) => save({ duration: d })}
        />

        <Button variant="primary" size="sm" onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </div>

      {/* Left pane: outline */}
      <div
        style={{
          gridArea: 'left',
          borderRight: '1px solid var(--editor-border)',
          background: 'var(--editor-panel)',
          overflow: 'auto',
        }}
      >
        <Outline
          scenes={scaledScenes}
          duration={duration}
          time={controller.time}
          onSeek={(t) => controller.setTime(t)}
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
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
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
            padding: '12px 24px',
            borderTop: '1px solid var(--editor-border)',
            background: 'var(--editor-panel)',
          }}
        >
          <PlaybackBar
            time={controller.time}
            duration={controller.duration}
            playing={controller.playing}
            onPlayPause={controller.togglePlay}
            onReset={controller.reset}
            onSeek={controller.setTime}
            onHover={() => {}}
          />
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
          fields={template.fields}
          value={localProps}
          onChange={setLocalProps}
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
