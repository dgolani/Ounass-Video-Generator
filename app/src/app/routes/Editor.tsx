import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { quickHash } from '../../lib/quickHash';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Stage,
  useStageController,
  SafeZoneOverlay,
  FieldFormatContext,
  LocaleContext,
  ThemeModeContext,
  type Locale,
  type ThemeMode,
} from '../../engine';
import { FormatDrawer } from '../components/FormatDrawer';
import type { FieldRole } from '../../templates/fields';
import {
  isFieldFormatEmpty,
  type FieldFormat,
} from '../../store/fieldFormat';
import { useBrand, applyBrand } from '../../store/brand';
import { applyLocalizedText, collectTranslatableStrings } from '../../lib/localizedText';
import {
  prewarmTranslator,
  retryTranslator,
  subscribeTranslatorState,
  translateBatch,
  type TranslatorState,
} from '../../lib/translate';
import {
  collectStringLeaves,
  copyMismatchWarning,
  summariseScriptsAcross,
} from '../../lib/scriptDetect';
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
import { timelineContentUpperSec } from '../../lib/timelineBounds';

/** Clamp music anchor/end against the current duration. Called on every
 *  timeline patch so a shorter video automatically pulls the music bed
 *  inside bounds (was a separate useEffect before; inlining avoids a
 *  double-save and keeps the history stack clean). */
function normalizeEditable(e: EditableState): EditableState {
  const d = e.duration;
  const upper = timelineContentUpperSec({
    duration: d,
    videoClipStartSec: e.videoClipStartSec,
    musicEndVideoTime: e.musicEndVideoTime,
  });
  const maxAnchor = Math.max(0, upper - 0.05);
  const anchor = Math.min(Math.max(0, e.musicAnchorVideoTime), maxAnchor);
  const minEnd = Math.min(upper, anchor + 0.15);
  const end = Math.min(upper, Math.max(minEnd, e.musicEndVideoTime));
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
  fieldFormatOverrides: {},
  localeOverride: undefined,
  themeMode: undefined,
  localizedText: {},
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
  /** Visual safe-zone guide overlay on the stage. Editor-only, persisted
   *  per-user in localStorage so the toggle sticks across sessions. */
  const [showSafeZones, setShowSafeZones] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vag:editor:showSafeZones') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('vag:editor:showSafeZones', showSafeZones ? '1' : '0');
    } catch {
      /* ignore quota / private mode */
    }
  }, [showSafeZones]);

  /** Active field in the Format drawer (null when drawer is closed).
   *  Tracks path + label + role so the drawer can render its header and
   *  family picker without PropertiesPanel needing to stay mounted. */
  const [formatField, setFormatField] = useState<
    { path: string; label: string; role: FieldRole } | null
  >(null);
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

  /** Update the format override for a single field path. Passing an empty
   *  format (all undefined) clears the override so the field reverts to
   *  the template's designer-intent style. Routes through the history
   *  stack so undo/redo rolls field formatting back with everything else. */
  const onFieldFormatChange = useCallback(
    (path: string, next: FieldFormat) => {
      setEditable((prev) => {
        const cur = prev.fieldFormatOverrides;
        const nextMap = { ...cur };
        if (isFieldFormatEmpty(next)) {
          delete nextMap[path];
        } else {
          nextMap[path] = next;
        }
        return { ...prev, fieldFormatOverrides: nextMap };
      });
    },
    [setEditable],
  );

  /** Per-project locale override. `undefined` reverts to the brand default. */
  const onLocaleOverrideChange = useCallback(
    (next: Locale | undefined) => {
      setEditable((prev) => ({ ...prev, localeOverride: next }));
    },
    [setEditable],
  );

  /** Per-project theme mode. Only meaningful for templates that opt
   *  into supportsThemes; the toggle in the top bar is hidden otherwise. */
  const onThemeModeChange = useCallback(
    (next: ThemeMode) => {
      setEditable((prev) => ({ ...prev, themeMode: next }));
    },
    [setEditable],
  );

  const template = project ? getTemplate(project.templateId) : null;
  const aspectIndex = editable.aspectIndex;
  const aspect = template?.meta.aspects[aspectIndex];
  const duration = editable.duration;
  const defaultDuration = template?.meta.defaultDuration ?? 9;
  const timeScale = duration / defaultDuration;
  const fieldFormatOverrides = editable.fieldFormatOverrides;
  /** Paths with any non-empty override — lights up the "Aa" button so
   *  marketers can see which fields have been customised at a glance. */
  const overriddenPaths = useMemo(() => {
    const s = new Set<string>();
    for (const [path, fmt] of Object.entries(fieldFormatOverrides)) {
      if (!isFieldFormatEmpty(fmt)) s.add(path);
    }
    return s;
  }, [fieldFormatOverrides]);

  /** Composed locale for this ad: project override wins, brand default
   *  underneath, `'en'` as last resort. Feeds both the Scene (via
   *  LocaleContext) and the per-project segmented toggle in the top bar. */
  const [brand] = useBrand();
  const effectiveLocale: Locale =
    editable.localeOverride ?? brand.locale ?? 'en';

  /** Render-time props with two locale-aware overlays applied:
   *
   *   1. **Brand logo swap.** When locale is 'ar' and the brand kit
   *      ships an `logoArabic` SVG, `applyBrand()` swaps it onto the
   *      template's `logo` path. EN locale keeps the Latin mark.
   *   2. **Auto-translated strings.** `localizedText.ar` (filled by
   *      Chrome Translator on the AR toggle, persisted on the project)
   *      is folded into every translatable text field by
   *      `applyLocalizedText`. Untranslated paths fall through to EN.
   *
   *  Both overlays produce a fresh object — `editable.props` is
   *  identity-stable across renders so undo/redo and history diffs
   *  continue to work against the source of truth, not the overlaid
   *  copy.
   */
  const localProps = useMemo(() => {
    const baseProps = editable.props as Record<string, unknown>;
    // Locale-aware brand overlay: re-applies on every locale change so
    // the boutique logo flips to its Arabic variant in AR.
    const branded = applyBrand(baseProps, brand, { locale: effectiveLocale });
    // Auto-translation overlay (AR only — EN renders the source props).
    if (effectiveLocale !== 'ar' || !template) return branded;
    const arOverrides = editable.localizedText?.ar;
    return applyLocalizedText(branded, template.fields, arOverrides);
  }, [editable.props, editable.localizedText, brand, effectiveLocale, template]);

  // ── Auto-translate (Chrome built-in Translator API) ─────────────────
  //
  // Two effects:
  //   1. Pre-warm on mount — fires `prewarmTranslator()` so the language
  //      pack starts downloading in the background while the marketer
  //      is still editing in EN. By the time they click AR, the
  //      translator is usually ready.
  //   2. AR-toggle filler — when the active locale is AR and any
  //      translatable EN string lacks an AR counterpart in
  //      `localizedText.ar`, fire a `translateBatch` for just the
  //      missing paths and merge the result. Handles both first-time
  //      fill and incremental updates (marketer edits an EN string
  //      while in AR mode → only the changed path re-translates).

  const [translatorState, setTranslatorState] =
    useState<TranslatorState>({ kind: 'unavailable', reason: 'no-api' });
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    // Subscribe first so the prewarm's state transitions land in React.
    const unsub = subscribeTranslatorState(setTranslatorState);
    void prewarmTranslator();
    return unsub;
  }, []);

  useEffect(() => {
    if (effectiveLocale !== 'ar' || !template) return;
    if (translatorState.kind !== 'available') return;

    const baseProps = editable.props as Record<string, unknown>;
    // Apply the brand overlay first so the source set we translate is
    // identical to what the scene will render — boutique name etc.
    const branded = applyBrand(baseProps, brand, { locale: effectiveLocale });
    const all = collectTranslatableStrings(branded, template.fields);
    const existing = editable.localizedText?.ar ?? {};

    // Find paths that need translation: either missing or whose source
    // EN string changed since the last fill (we detect change by
    // re-translating; the cheap on-device call is fine).
    const missing: Record<string, string> = {};
    for (const [path, en] of Object.entries(all)) {
      if (!(path in existing)) {
        missing[path] = en;
      }
    }
    if (Object.keys(missing).length === 0) return;

    let cancelled = false;
    setIsTranslating(true);
    void translateBatch(missing).then((translations) => {
      if (cancelled) return;
      setEditable((prev) => ({
        ...prev,
        localizedText: {
          ...prev.localizedText,
          ar: { ...(prev.localizedText?.ar ?? {}), ...translations },
        },
      }));
      setIsTranslating(false);
    });
    return () => {
      cancelled = true;
    };
  }, [
    effectiveLocale,
    template,
    translatorState.kind,
    editable.props,
    editable.localizedText,
    brand,
    setEditable,
  ]);

  /** Theme mode for this ad (light | dark). Only meaningful when the
   *  template opts in via `meta.supportsThemes`; unthemed templates
   *  still read this value but ignore it. Defaults to 'light'. */
  const effectiveThemeMode: ThemeMode = editable.themeMode ?? 'light';
  const supportsThemes = template?.meta.supportsThemes === true;

  /** Soft warning when the active locale disagrees with the majority
   *  script of the editable copy (e.g. Arabic-locale ad with mostly
   *  Latin text = un-translated draft). Null when everything aligns. */
  const copyWarning = useMemo(() => {
    const leaves = collectStringLeaves(localProps);
    const summary = summariseScriptsAcross(leaves);
    return copyMismatchWarning(effectiveLocale, summary);
  }, [localProps, effectiveLocale]);

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

  /** All top-level text fields, in visual order (left pane first, then
   *  right). Powers the drawer's ↑/↓ keyboard navigation so power users
   *  can move between fields without clicking each Aa button. */
  const allTextFields = useMemo(() => {
    if (!template) return [] as Array<{ path: string; label: string; role: FieldRole }>;
    const out: Array<{ path: string; label: string; role: FieldRole }> = [];
    for (const src of [leftPaneFields, rightPaneFields]) {
      for (const f of src) {
        if (f.kind === 'text') {
          out.push({ path: f.path, label: f.label, role: f.role ?? 'body' });
        }
      }
    }
    return out;
  }, [leftPaneFields, rightPaneFields, template]);

  /** Arrow-key / j-k navigation between text fields while the Format
   *  drawer is open. Also handles Escape to close (complements the
   *  drawer's own Escape handler). Ignored when focus is inside a text
   *  input / textarea so typing doesn't get intercepted. */
  useEffect(() => {
    if (!formatField) return;
    const onKey = (e: KeyboardEvent) => {
      // Don't steal arrow keys from an input / textarea / contenteditable.
      const tgt = e.target as HTMLElement | null;
      if (
        tgt &&
        (tgt.tagName === 'INPUT' ||
          tgt.tagName === 'TEXTAREA' ||
          tgt.isContentEditable)
      ) {
        return;
      }
      const idx = allTextFields.findIndex((f) => f.path === formatField.path);
      if (idx < 0) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const next = allTextFields[(idx + 1) % allTextFields.length];
        setFormatField(next);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prev =
          allTextFields[(idx - 1 + allTextFields.length) % allTextFields.length];
        setFormatField(prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [formatField, allTextFields]);

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
        <Button variant="ghost" size="sm" onClick={() => nav('/dashboard')}>
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
          {/* Reserved fixed-width slot for the autosave hint
           *  ("SAVED" / "Saving…" / storage error). Always rendered;
           *  swaps to `visibility: hidden` between flashes so the
           *  toolbar geometry stays identical across save cycles —
           *  prevents the umbrella + right cluster from sliding every
           *  time autosave fires. Sized for the longest label
           *  (`Storage full!` ≈ 92px). */}
          <span
            aria-live="polite"
            style={{
              display: 'inline-block',
              flex: '0 0 92px',
              width: 92,
              minWidth: 92,
              fontFamily: 'var(--sans)',
              fontSize: 11,
              color: savedHint?.startsWith('Storage')
                ? '#D85258'
                : 'var(--success)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              visibility: savedHint ? 'visible' : 'hidden',
            }}
          >
            {savedHint ?? 'Saved'}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* ── Settings umbrella ─────────────────────────────────────
         *
         *  All four per-project view settings live inside one rounded
         *  container with hairline dividers — visually a single unit so
         *  the marketer reads it as "this ad's view options" rather
         *  than four separate toolbar widgets. Order is intentional:
         *
         *    Aspect → Safe → Theme (only if template opts in) → Locale
         *
         *  Aspect is the most physical (changes canvas dimensions);
         *  Safe is the editor-only viewfinder hint; Theme + Locale are
         *  per-project overrides on top of brand-kit defaults. The
         *  auto-translate status pill, when present, hugs the locale
         *  group so the marketer sees the relationship at a glance.
         *
         *  Centered in the toolbar via flex-1 spacers on both sides.
         */}
        <SettingsUmbrella>
          <UmbrellaSlot>
            <AspectSwitcher
              aspects={template.meta.aspects}
              index={aspectIndex}
              onChange={onAspectChange}
            />
          </UmbrellaSlot>

          <UmbrellaDivider />

          <UmbrellaSlot>
            <SafeToggle
              active={showSafeZones}
              onClick={() => setShowSafeZones((v) => !v)}
            />
          </UmbrellaSlot>

          {supportsThemes && (
            <>
              <UmbrellaDivider />
              <UmbrellaSlot>
                <ThemeMiniToggle
                  mode={effectiveThemeMode}
                  onChange={onThemeModeChange}
                />
              </UmbrellaSlot>
            </>
          )}

          <UmbrellaDivider />

          <UmbrellaSlot>
            <LocaleSegmented
              locale={effectiveLocale}
              isOverride={editable.localeOverride !== undefined}
              brandDefault={brand.locale}
              onChange={onLocaleOverrideChange}
            />
            {/* Permanently-reserved fixed-width well for the AR
             *  translate-status pill. Always rendered (even on EN
             *  locale) so the umbrella width is stable across every
             *  toggle interaction — clicking EN↔AR, the pill cycling
             *  through downloading/translating/steady, never shifts
             *  the toolbar by a single pixel. Width is sized for the
             *  longest pill text ("Preparing AR · 100%" ≈ 165px). */}
            <div
              aria-hidden={effectiveLocale !== 'ar'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minWidth: 168,
                visibility: effectiveLocale === 'ar' ? 'visible' : 'hidden',
              }}
            >
              <TranslateStatusPill
                state={translatorState}
                translating={isTranslating}
              />
            </div>
          </UmbrellaSlot>
        </SettingsUmbrella>

        <div style={{ flex: 1 }} />

        {/* Copy / locale mismatch warning — yellow chip that appears
         *  when script detection disagrees with the active locale.
         *
         *  Rendered inside a permanent fixed-width slot so toggling
         *  the warning on (e.g. clicking AR with EN copy still in the
         *  fields) doesn't push the rest of the toolbar around. The
         *  chip uses `visibility: hidden` rather than conditional
         *  render when there's no warning — geometry stays identical
         *  either way, only the pixels light up. */}
        <div
          aria-hidden={!copyWarning}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            width: 160,
            justifyContent: 'flex-end',
          }}
        >
          <div
            role="status"
            title={copyWarning ?? undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              fontFamily: 'var(--sans)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: '#1a1407',
              background: '#E6B852',
              border: '1px solid #C49E3E',
              borderRadius: 'var(--r-md)',
              maxWidth: 260,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              visibility: copyWarning ? 'visible' : 'hidden',
            }}
          >
            <span aria-hidden style={{ fontSize: 12 }}>
              ⚠
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Locale mismatch
            </span>
          </div>
        </div>

        {/* Undo/redo — SVG arrow icons, square 32px ghost buttons.
         *  Sit immediately before Export so destructive actions are
         *  rightmost and the eye lands on Export last. */}
        <div style={{ display: 'flex', gap: 2 }}>
          <IconButton onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
            <UndoIcon />
          </IconButton>
          <IconButton onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">
            <RedoIcon />
          </IconButton>
        </div>

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
          overriddenPaths={overriddenPaths}
          onOpenFormatField={(path, label, role) =>
            setFormatField({ path, label, role })
          }
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
            {/* Scenes always render with safe margins applied (the "safe zones"
             *  toggle in the top bar only controls the dim-overlay visibility
             *  below — the composition doesn't change). Exports and gallery
             *  preview cards render the same safe-aware scene.
             *
             *  FieldFormatContext carries per-field overrides from this
             *  project's EditableState down to every useFieldFormat call.
             *  Preview cards don't provide overrides (empty map default),
             *  so gallery thumbnails render at template defaults. */}
            <FieldFormatContext.Provider value={fieldFormatOverrides}>
              <LocaleContext.Provider value={effectiveLocale}>
                <ThemeModeContext.Provider value={effectiveThemeMode}>
                  <Scene
                    props={localProps}
                    timeScale={timeScale}
                    width={aspect.width}
                    height={aspect.height}
                  />
                  {/* Editor-only guide; sibling of the Scene so it shares the
                   *  stage transform and stays pixel-aligned at any zoom. */}
                  {showSafeZones && <SafeZoneOverlay aspect={aspect} />}
                </ThemeModeContext.Provider>
              </LocaleContext.Provider>
            </FieldFormatContext.Provider>
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
          overriddenPaths={overriddenPaths}
          onOpenFormatField={(path, label, role) =>
            setFormatField({ path, label, role })
          }
        />
      </div>

      <FormatDrawer
        open={formatField !== null}
        onClose={() => setFormatField(null)}
        fieldPath={formatField?.path ?? ''}
        fieldLabel={formatField?.label ?? ''}
        role={formatField?.role ?? 'body'}
        value={
          formatField ? fieldFormatOverrides[formatField.path] ?? {} : {}
        }
        onChange={(next) => {
          if (formatField) onFieldFormatChange(formatField.path, next);
        }}
      />

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
        safeZonesOn={showSafeZones}
        onToggleSafeZones={() => setShowSafeZones((v) => !v)}
      />
    </div>
  );
}

/** Clean-line SVG icon — 16×16 on a 24-viewbox. currentColor follows
 *  the button text color, so the same icon works in ghost / disabled /
 *  hover states without extra tokens. */
function UndoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 016 6v1" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H10a6 6 0 00-6 6v1" />
    </svg>
  );
}

/** 32×32 square ghost icon button. Monochrome by default, subtly tints
 *  on hover. Matches the visual language of the segmented controls
 *  without competing with the Export CTA. */
function IconButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        padding: 0,
        background:
          !disabled && hover ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: '1px solid transparent',
        borderRadius: 'var(--r-md)',
        color: disabled ? 'var(--editor-text-dim)' : 'var(--editor-text)',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 120ms, opacity 120ms',
      }}
    >
      {children}
    </button>
  );
}

/** Safe-zone guide toggle. Ghost when off, subtle copper-tinted chip
 *  when on — visibly "active" without stealing attention from Export. */
function SafeToggle({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={
        active
          ? 'Hide safe-zone guide (platform UI clearance)'
          : 'Show safe-zone guide (platform UI clearance)'
      }
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 12px',
        fontFamily: 'var(--sans)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: active
          ? 'var(--editor-text)'
          : hover
            ? 'var(--editor-text)'
            : 'var(--editor-text-dim)',
        background: active
          ? 'rgba(196,147,115,0.14)'
          : hover
            ? 'rgba(255,255,255,0.04)'
            : 'transparent',
        border: `1px solid ${
          active ? 'rgba(196,147,115,0.45)' : 'var(--editor-border)'
        }`,
        borderRadius: 'var(--r-md)',
        cursor: 'pointer',
        transition: 'background 120ms, color 120ms, border-color 120ms',
      }}
    >
      {/* Outlined/filled dot visually reinforces the state beyond just
       *  the label change — "Safe" stays the same word in both states. */}
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          border: `1.5px solid ${
            active ? 'var(--editor-accent)' : 'var(--editor-text-dim)'
          }`,
          background: active ? 'var(--editor-accent)' : 'transparent',
          transition: 'background 120ms, border-color 120ms',
        }}
      />
      Safe
    </button>
  );
}

/** Per-project locale toggle in the editor top bar. Segmented
 *  EN / العربية. Click the active side again to clear the override
 *  (revert to the brand default). */
function LocaleSegmented({
  locale,
  isOverride,
  brandDefault,
  onChange,
}: {
  locale: Locale;
  isOverride: boolean;
  brandDefault: Locale;
  onChange: (next: Locale | undefined) => void;
}) {
  const options: Array<{ value: Locale; label: string }> = [
    { value: 'en', label: 'EN' },
    { value: 'ar', label: 'AR' },
  ];
  return (
    <div
      role="tablist"
      aria-label="Locale"
      style={{
        display: 'inline-flex',
        background: 'var(--editor-panel-2)',
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-md)',
        padding: 2,
      }}
      title={
        isOverride
          ? `Locale overridden for this ad (brand default: ${brandDefault.toUpperCase()})`
          : `Inherits brand default (${brandDefault.toUpperCase()})`
      }
    >
      {options.map((opt) => {
        const active = locale === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              // Clicking the active side while an override exists clears
              // the override (reverts to brand default). Otherwise set an
              // override to the clicked value unless it matches brand —
              // then clear so the ad inherits naturally.
              if (opt.value === brandDefault) onChange(undefined);
              else onChange(opt.value);
            }}
            style={{
              // Neutral tint for active — same vocabulary as AspectSwitcher.
              background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: active ? 'var(--editor-text)' : 'var(--editor-text-dim)',
              border: 0,
              padding: '4px 10px',
              // minWidth holds the button geometry steady so the bold-vs-
              // medium fontWeight toggle below doesn't reflow the row by
              // a couple of pixels each click. Sized for the bold "AR" /
              // "EN" glyphs at 11px / serif fallback for AR.
              minWidth: 32,
              textAlign: 'center',
              fontFamily: opt.value === 'ar' ? 'var(--serif)' : 'var(--sans)',
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              letterSpacing: opt.value === 'en' ? '0.08em' : 0,
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'background 120ms, color 120ms',
              position: 'relative',
            }}
          >
            {opt.label}
            {active && isOverride && (
              // Tiny copper dot signals "this ad overrides the brand
              // default locale". Copper is allowed here because the
              // dot is 5px — it doesn't compete with the Export CTA.
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--editor-accent)',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Settings umbrella — single rounded container that groups Aspect /
 *  Safe / Theme / Locale into one visual unit. Internal hairline
 *  dividers (UmbrellaDivider) separate the groups; each group sits
 *  inside an UmbrellaSlot so the padding and alignment stay consistent
 *  even as we add/remove sections (theme is conditional). The whole
 *  unit reads as "this ad's view options" rather than four toolbar
 *  widgets competing for attention. */
function SettingsUmbrella({ children }: { children: React.ReactNode }) {
  // No `overflow: hidden` here — popovers anchored to children
  // (e.g. TranslateStatusPill's diagnostic panel) must be able to
  // escape the umbrella's rounded corners. The hairline dividers
  // and slot children don't bleed outside the rounded shell on
  // their own, so we don't need clipping.
  return (
    <div
      role="group"
      aria-label="Project settings"
      style={{
        display: 'inline-flex',
        alignItems: 'stretch',
        background: 'var(--editor-panel-2)',
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-md)',
        height: 36,
      }}
    >
      {children}
    </div>
  );
}

function UmbrellaSlot({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 8px',
      }}
    >
      {children}
    </div>
  );
}

function UmbrellaDivider() {
  // Hairline column between groups. Sits flush top-to-bottom of the
  // container so the umbrella reads as one segmented unit (think the
  // Mac menubar's vertical dividers, not the Discord channel dividers).
  return (
    <div
      aria-hidden
      style={{
        width: 1,
        background: 'var(--editor-border)',
        flex: 'none',
      }}
    />
  );
}

/** Compact sun/moon theme toggle for the toolbar umbrella.
 *
 *  Same sliding-copper-marker pattern as the previous stage-floating
 *  pill, but tuned to sit inside the umbrella's panel-2 background
 *  rather than over arbitrary scene art (so no glass-morph blur
 *  backdrop, and the inactive icons use the editor-text-dim token
 *  to match the other unselected toolbar widgets).
 *
 *  Carries `data-export-ignore="true"` like every editor-only chrome
 *  element — but it doesn't actually need it here because the umbrella
 *  lives in the toolbar grid area, not as a Stage sibling. Keeping the
 *  attribute is cheap insurance for future moves. */
function ThemeMiniToggle({
  mode,
  onChange,
}: {
  mode: ThemeMode;
  onChange: (next: ThemeMode) => void;
}) {
  const isDark = mode === 'dark';
  return (
    <div
      data-export-ignore="true"
      role="tablist"
      aria-label="Theme"
      title="Switch between the template's light and dark palette"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        padding: 2,
        gap: 0,
        background: 'rgba(0,0,0,0.18)',
        border: '1px solid var(--editor-border)',
        borderRadius: 999,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 2,
          bottom: 2,
          left: 2,
          width: 26,
          borderRadius: 999,
          background:
            'linear-gradient(180deg, #C49373 0%, #A9724E 100%)',
          boxShadow:
            '0 1px 3px rgba(169, 114, 78, 0.45), inset 0 1px 0 rgba(255, 228, 208, 0.35)',
          transform: `translateX(${isDark ? 26 : 0}px)`,
          transition:
            'transform 180ms cubic-bezier(0.32, 0.72, 0, 1)',
          pointerEvents: 'none',
        }}
      />
      {(['light', 'dark'] as const).map((value) => {
        const active = mode === value;
        const isLightBtn = value === 'light';
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={isLightBtn ? 'Light theme' : 'Dark theme'}
            onClick={() => onChange(value)}
            style={{
              position: 'relative',
              zIndex: 1,
              width: 26,
              height: 26,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 0,
              background: 'transparent',
              color: active ? '#1A1208' : 'var(--editor-text-dim)',
              cursor: 'pointer',
              borderRadius: 999,
              transition: 'color 160ms ease',
            }}
          >
            {isLightBtn ? (
              <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
                <circle cx="8" cy="8" r="3" fill="currentColor" />
                <g
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                >
                  <line x1="8" y1="1.5" x2="8" y2="3" />
                  <line x1="8" y1="13" x2="8" y2="14.5" />
                  <line x1="1.5" y1="8" x2="3" y2="8" />
                  <line x1="13" y1="8" x2="14.5" y2="8" />
                  <line x1="3.2" y1="3.2" x2="4.3" y2="4.3" />
                  <line x1="11.7" y1="11.7" x2="12.8" y2="12.8" />
                  <line x1="3.2" y1="12.8" x2="4.3" y2="11.7" />
                  <line x1="11.7" y1="4.3" x2="12.8" y2="3.2" />
                </g>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
                <path
                  d="M13.2 9.9A5.5 5.5 0 1 1 6.1 2.8a4.5 4.5 0 0 0 7.1 7.1Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        );
      })}
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
        background: 'var(--editor-panel-2)',
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
              // Active = subtle lighter tint on the panel bg (not copper).
              // Keeps the visual hierarchy: only Export pulls the eye with
              // the brand colour; state indicators use monochrome tint.
              background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: active ? 'var(--editor-text)' : 'var(--editor-text-dim)',
              border: 0,
              borderRadius: 3,
              cursor: single ? 'default' : 'pointer',
              opacity: single && !active ? 0.5 : 1,
              transition: 'background 120ms, color 120ms',
            }}
          >
            {a.label.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}

/** Small pill rendered next to the LocaleSegmented when AR is active.
 *
 *  Shows one of three states:
 *    - **Downloading** — first-time pack download in progress; shows
 *      a small percentage so the marketer knows the wait is finite.
 *    - **Translating** — batch in flight (post-pack-ready). Spinner.
 *    - **Unavailable (no Chrome API)** — info pill with tooltip
 *      explaining the marketer can still type Arabic manually.
 *
 *  Steady state (translator ready + no in-flight batch) renders
 *  nothing — the pill is intentionally quiet so the toolbar doesn't
 *  carry permanent chrome that says "AR mode is on" (the locale
 *  segmented control already shows that). */
function TranslateStatusPill({
  state,
  translating,
}: {
  state: TranslatorState;
  translating: boolean;
}) {
  // Local "is the popover open" state. Click pill to toggle. Closes
  // automatically when clicking outside or pressing Escape.
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Resolve the pill's surface form (label, tone, etc.) from state.
  // Steady "Chrome-on-device" path renders a quiet pill that's still
  // clickable so the marketer can confirm what's active and access the
  // diagnostic popover at any time. (The previous build returned null
  // here, hiding the affordance entirely — making it discoverable
  // helps debugging.)
  let label: string;
  let tone: 'info' | 'progress' | 'warn' | 'success';

  if (state.kind === 'downloading') {
    label = `Preparing AR · ${Math.round(state.progress * 100)}%`;
    tone = 'progress';
  } else if (translating) {
    label = 'Translating…';
    tone = 'progress';
  } else if (state.kind === 'available' && state.provider === 'mymemory') {
    label = 'Cloud translate';
    tone = 'info';
  } else if (state.kind === 'available' && state.provider === 'chrome') {
    label = 'On-device';
    tone = 'success';
  } else if (state.kind === 'unavailable') {
    label = 'Auto-translate off';
    tone = 'warn';
  } else {
    label = 'Auto-translate';
    tone = 'info';
  }

  const colors =
    tone === 'progress'
      ? { fg: '#1A1208', bg: 'var(--editor-accent)', border: 'var(--editor-accent)' }
      : tone === 'success'
        ? { fg: 'var(--editor-text)', bg: 'var(--editor-panel-2)', border: 'var(--editor-border)' }
        : tone === 'info'
          ? { fg: 'var(--editor-text)', bg: 'var(--editor-panel-2)', border: 'var(--editor-border)' }
          : { fg: 'var(--editor-text-dim)', bg: 'var(--editor-panel-2)', border: 'var(--editor-border)' };

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          fontFamily: 'var(--sans)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: colors.fg,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 'var(--r-md)',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          transition: 'background 120ms, color 120ms',
        }}
      >
        {tone === 'progress' && (
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              border: '1.5px solid currentColor',
              borderRightColor: 'transparent',
              animation: 'translate-spin 0.9s linear infinite',
            }}
          />
        )}
        {tone === 'success' && (
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--success)',
            }}
          />
        )}
        {(tone === 'warn' || tone === 'info') && <span aria-hidden>ⓘ</span>}
        {label}
      </button>
      {open && <TranslatePopover state={state} translating={translating} />}
      <style>{`@keyframes translate-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/** Click-down popover anchored to the pill, with state-aware content.
 *
 *  Three primary scenarios:
 *
 *  1. **Cloud fallback active.** Shows the why ("Chrome's on-device
 *     translator isn't available") and an upgrade path: copy two
 *     chrome:// URLs to enable the on-device API. Each URL has its
 *     own one-click copy button with a brief "Copied" confirmation.
 *
 *  2. **Unavailable / error.** Shows the captured error detail in a
 *     code block, a Retry button, and the same upgrade path so the
 *     marketer can opt into the on-device flow if their browser
 *     supports it.
 *
 *  3. **On-device active.** Confirms the path with a green dot and
 *     surfaces the language pack info — no upgrade nag needed.
 *
 *  Browser security blocks programmatic navigation to chrome:// URLs,
 *  so the popover surfaces the URLs as copyable strings + clear steps
 *  rather than fake-action buttons. Trust the marketer to paste; don't
 *  pretend a button can do something the browser disallows. */
function TranslatePopover({
  state,
  translating,
}: {
  state: TranslatorState;
  translating: boolean;
}) {
  const isCloud = state.kind === 'available' && state.provider === 'mymemory';
  const isOnDevice = state.kind === 'available' && state.provider === 'chrome';
  const isUnavailable = state.kind === 'unavailable';
  const isDownloading = state.kind === 'downloading';

  return (
    <div
      role="dialog"
      aria-label="Auto-translate options"
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        right: 0,
        zIndex: 50,
        width: 340,
        padding: 14,
        background: 'var(--editor-panel)',
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--r-md)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.42), 0 2px 8px rgba(0,0,0,0.28)',
        fontFamily: 'var(--sans)',
        fontSize: 12,
        color: 'var(--editor-text)',
        lineHeight: 1.5,
        textAlign: 'left',
      }}
    >
      {/* Header — state title + sub */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--serif)',
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          {isOnDevice && (
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--success)',
              }}
            />
          )}
          {isCloud && '☁'}
          {isUnavailable && '⚠'}
          {isDownloading && '⏳'}
          {translating && !isUnavailable && '⏳'}
          <span>
            {isOnDevice && 'On-device translation'}
            {isCloud && 'Cloud translation (MyMemory)'}
            {isUnavailable && 'Auto-translate is off'}
            {isDownloading && 'Preparing on-device translator'}
            {translating && state.kind !== 'unavailable' && !isDownloading && !isOnDevice && !isCloud && 'Translating…'}
          </span>
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: 'var(--editor-text-dim)',
            letterSpacing: '0.02em',
          }}
        >
          {isOnDevice && 'Translations run locally via Chrome\u2019s built-in Gemini Nano. Free, private, offline after the first download.'}
          {isCloud && 'Each AR fill makes a small network call to MyMemory. Free up to 1 000 words/day per IP.'}
          {isUnavailable && state.reason === 'no-api' &&
            'Chrome\u2019s built-in translator isn\u2019t exposed in this browser, and the cloud fallback couldn\u2019t reach the network.'}
          {isUnavailable && state.reason === 'pair-not-supported' &&
            'Chrome reports EN→AR isn\u2019t supported on this device — the on-device language model may not be installed yet. The cloud fallback also couldn\u2019t reach the network.'}
          {isUnavailable && state.reason === 'error' &&
            'The translator failed to initialise. Try the steps below or fall back to typing Arabic manually.'}
          {isDownloading && `${Math.round(state.progress * 100)}% downloaded. About 22 MB total — happens once per browser, then translation is instant and offline.`}
        </div>
      </div>

      {/* Error detail when present */}
      {isUnavailable && state.reason === 'error' && state.detail && (
        <div
          style={{
            margin: '6px 0 12px',
            padding: '8px 10px',
            background: 'rgba(216, 82, 88, 0.08)',
            border: '1px solid rgba(216, 82, 88, 0.32)',
            borderRadius: 4,
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            fontSize: 11,
            color: '#D85258',
            wordBreak: 'break-word',
          }}
        >
          {state.detail}
        </div>
      )}

      {/* Upgrade path — shown whenever cloud-or-error so marketers can
       *  opt into the on-device flow if their Chrome supports it. Hidden
       *  in steady on-device or downloading states (no nag needed). */}
      {(isCloud || isUnavailable) && (
        <ChromeOnDeviceSteps />
      )}

      {/* Footer actions — Retry for error state, Close for everything. */}
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
        }}
      >
        {(isUnavailable || isCloud) && (
          <button
            type="button"
            onClick={() => void retryTranslator()}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              color: 'var(--editor-text)',
              border: '1px solid var(--editor-border)',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Retry detection
          </button>
        )}
      </div>
    </div>
  );
}

/** Numbered steps to enable Chrome's on-device Translator API. Each
 *  chrome:// URL gets a one-click "Copy" button that places it on the
 *  clipboard and flashes a confirmation — browsers block JS-initiated
 *  navigation to chrome:// URLs, so paste-and-go is the most direct
 *  affordance we can offer. */
function ChromeOnDeviceSteps() {
  return (
    <div
      style={{
        marginTop: 6,
        padding: 10,
        background: 'var(--editor-panel-2)',
        border: '1px solid var(--editor-border)',
        borderRadius: 4,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--editor-text-dim)',
          marginBottom: 8,
        }}
      >
        Want it faster + offline?
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--editor-text-dim)',
          marginBottom: 10,
        }}
      >
        Enable Chrome\u2019s on-device translator (one-time, ~22 MB
        download). Works in Chrome 138+ and Edge.
      </div>
      <ol
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          counterReset: 'step',
        }}
      >
        <CopyStep
          n={1}
          label="Open the flag, set to Enabled"
          url="chrome://flags/#translation-api"
        />
        <CopyStep
          n={2}
          label="Make sure the language model is installed"
          url="chrome://components/"
          hint='Look for "Optimization Guide On Device Model" → Update if old'
        />
        <li
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <span style={stepNumberStyle}>3</span>
          <span style={{ fontSize: 12 }}>
            Restart Chrome, reload this page, click <b>Retry detection</b>{' '}
            below.
          </span>
        </li>
      </ol>
    </div>
  );
}

const stepNumberStyle: React.CSSProperties = {
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

/** Single step row with a chrome:// URL displayed as a code chip + a
 *  Copy button that flashes "Copied" for 1.6 s after success. */
function CopyStep({
  n,
  label,
  url,
  hint,
}: {
  n: number;
  label: string;
  url: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <span style={stepNumberStyle}>{n}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--editor-panel)',
            border: '1px solid var(--editor-border)',
            borderRadius: 4,
            padding: '4px 6px',
          }}
        >
          <code
            style={{
              flex: 1,
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              fontSize: 11,
              color: 'var(--editor-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {url}
          </code>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              } catch {
                /* clipboard denied — silent; user can select + copy */
              }
            }}
            style={{
              flex: 'none',
              padding: '3px 8px',
              background: copied ? 'var(--success)' : 'var(--editor-accent)',
              color: '#1A1208',
              border: 0,
              borderRadius: 3,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              minWidth: 56,
              transition: 'background 160ms',
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {hint && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: 'var(--editor-text-dim)',
              fontStyle: 'italic',
            }}
          >
            {hint}
          </div>
        )}
      </div>
    </li>
  );
}
