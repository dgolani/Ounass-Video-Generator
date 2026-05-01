import { useEffect, useState, useCallback } from 'react';
import type { Project, ProjectBackground } from './types';
import { MAX_TIMELINE_EXTENT_SEC, timelineContentUpperSec } from '../lib/timelineBounds';
import { isVideoUrl } from '../lib/media';

const KEY = 'vag:projects:v1';
const CHANNEL = 'vag:projects:changed';

const MIN_VIDEO_DURATION = 5;
const MAX_VIDEO_DURATION = 30;

function normalizeProject(raw: Project): Project {
  const vol = raw.musicVolume;
  const musicVolume =
    typeof vol === 'number' && Number.isFinite(vol) && vol >= 0 && vol <= 1
      ? vol
      : 0.35;
  let L =
    typeof raw.duration === 'number' && Number.isFinite(raw.duration) && raw.duration > 0
      ? raw.duration
      : 9;
  L = Math.min(MAX_VIDEO_DURATION, Math.max(MIN_VIDEO_DURATION, L));

  let vStart =
    typeof raw.videoClipStartSec === 'number' && Number.isFinite(raw.videoClipStartSec)
      ? raw.videoClipStartSec
      : 0;
  vStart = Math.min(Math.max(0, vStart), MAX_TIMELINE_EXTENT_SEC - MIN_VIDEO_DURATION);
  if (vStart + L > MAX_TIMELINE_EXTENT_SEC) {
    L = Math.max(MIN_VIDEO_DURATION, MAX_TIMELINE_EXTENT_SEC - vStart);
  }

  let anchor =
    typeof raw.musicAnchorVideoTime === 'number' && Number.isFinite(raw.musicAnchorVideoTime)
      ? raw.musicAnchorVideoTime
      : 0;
  let end =
    typeof raw.musicEndVideoTime === 'number' && Number.isFinite(raw.musicEndVideoTime)
      ? raw.musicEndVideoTime
      : L;
  const upper = timelineContentUpperSec({
    duration: L,
    videoClipStartSec: vStart,
    musicEndVideoTime: end,
  });
  const maxAnchor = Math.max(0, upper - 0.05);
  anchor = Math.min(Math.max(0, anchor), maxAnchor);
  let trimS =
    typeof raw.musicTrimStartSec === 'number' && Number.isFinite(raw.musicTrimStartSec)
      ? raw.musicTrimStartSec
      : 0;
  trimS = Math.min(Math.max(0, trimS), 120);
  const minEnd = anchor + 0.15;
  end = Math.min(Math.max(minEnd, end), upper);

  // Project-level background — accept the explicit `background` field
  // when present, otherwise migrate from the legacy per-template props
  // shape (`props.backgroundImage` / `props.videoSrc`) so existing
  // projects keep their backdrop after the cutover. The migration runs
  // once per load; future updates write to `raw.background` directly.
  // The video bg anchor + end default to the content layer's range
  // (videoClipStartSec → videoClipStartSec + duration) so the bg
  // visually aligns with the blue content clip on the timeline.
  const background = normalizeBackground(raw.background, raw.props, L, vStart);

  return {
    ...raw,
    backgroundTrackId:
      raw.backgroundTrackId === undefined || raw.backgroundTrackId === ''
        ? null
        : raw.backgroundTrackId,
    musicVolume,
    musicAnchorVideoTime: anchor,
    musicTrimStartSec: trimS,
    musicEndVideoTime: end,
    duration: L,
    videoClipStartSec: vStart,
    background,
  };
}

/** Validate (or auto-migrate from legacy props) the Project.background
 *  field. Returns `undefined` for no-background; never throws. */
function normalizeBackground(
  raw: ProjectBackground | undefined,
  props: unknown,
  duration: number,
  videoClipStartSec: number,
): ProjectBackground | undefined {
  // Path A — explicit background already set on the project.
  if (raw && typeof raw === 'object' && typeof (raw as ProjectBackground).src === 'string') {
    const dim = clamp01(typeof raw.dim === 'number' ? raw.dim : 0);
    if (raw.kind === 'image') {
      return { kind: 'image', src: raw.src, dim };
    }
    if (raw.kind === 'video') {
      const defaultAnchor = videoClipStartSec;
      const defaultEnd = videoClipStartSec + duration;
      const anchor = Math.max(0, Number.isFinite(raw.anchorVideoTime) ? raw.anchorVideoTime : defaultAnchor);
      const trim = Math.max(0, Number.isFinite(raw.trimStartSec) ? raw.trimStartSec : 0);
      const end = Math.max(
        anchor + 0.05,
        Number.isFinite(raw.endVideoTime) ? raw.endVideoTime : defaultEnd,
      );
      return {
        kind: 'video',
        src: raw.src,
        dim: dim || 0.24,
        anchorVideoTime: anchor,
        trimStartSec: trim,
        endVideoTime: end,
      };
    }
  }

  // Path B — auto-migrate from legacy per-template props. Earlier
  // templates exposed `backgroundImage` (image upload OR video URL
  // paste); The Reel exposed both `videoSrc` (video URL) and
  // `productImage`. Pick the first one that looks live.
  if (props && typeof props === 'object') {
    const p = props as Record<string, unknown>;
    const candidate = (typeof p.videoSrc === 'string' && p.videoSrc) || undefined;
    const legacy = (typeof p.backgroundImage === 'string' && p.backgroundImage) || undefined;
    const src = candidate || legacy;
    if (src) {
      if (isVideoUrl(src)) {
        return {
          kind: 'video',
          src,
          dim: typeof p.videoDim === 'number' ? clamp01(p.videoDim) : 0.24,
          anchorVideoTime: videoClipStartSec,
          trimStartSec: 0,
          endVideoTime: videoClipStartSec + duration,
        };
      }
      return { kind: 'image', src, dim: 0 };
    }
  }

  return undefined;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function readAll(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => normalizeProject(p as Project));
  } catch {
    return [];
  }
}

export class StorageQuotaError extends Error {
  constructor() {
    super('Storage quota exceeded');
    this.name = 'StorageQuotaError';
  }
}

function writeAll(projects: Project[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(projects));
    window.dispatchEvent(new CustomEvent(CHANNEL));
  } catch (e) {
    if (
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)
    ) {
      throw new StorageQuotaError();
    }
    /* private mode / other — swallow to avoid breaking UI */
  }
}

function uid() {
  return (
    Math.random().toString(36).slice(2, 8) +
    Date.now().toString(36).slice(-4)
  );
}

export function createProject(
  init: Pick<Project, 'templateId' | 'props' | 'aspectIndex' | 'duration' | 'name'>,
): Project {
  const now = Date.now();
  const project: Project = {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    backgroundTrackId: null,
    musicVolume: 0.35,
    musicAnchorVideoTime: 0,
    musicTrimStartSec: 0,
    ...init,
    musicEndVideoTime: init.duration,
    videoClipStartSec: 0,
  };
  const all = readAll();
  all.unshift(project);
  writeAll(all);
  return project;
}

export function updateProject(
  id: string,
  patch: Partial<Omit<Project, 'id' | 'createdAt'>>,
): Project | null {
  const all = readAll();
  const i = all.findIndex((p) => p.id === id);
  if (i === -1) return null;
  const updated: Project = { ...all[i], ...patch, updatedAt: Date.now() };
  all[i] = updated;
  writeAll(all);
  return updated;
}

export function deleteProject(id: string) {
  const all = readAll().filter((p) => p.id !== id);
  writeAll(all);
}

export function getProject(id: string): Project | null {
  return readAll().find((p) => p.id === id) ?? null;
}

/** React hook: subscribe to the project list */
export function useProjects(): Project[] {
  const [list, setList] = useState<Project[]>(() => readAll());
  useEffect(() => {
    const onChange = () => setList(readAll());
    window.addEventListener(CHANNEL, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CHANNEL, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return list;
}

/** React hook: load + save a single project by id */
export function useProject(id: string | undefined) {
  const [project, setProject] = useState<Project | null>(() =>
    id ? getProject(id) : null,
  );

  useEffect(() => {
    setProject(id ? getProject(id) : null);
  }, [id]);

  const save = useCallback(
    (patch: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
      if (!id) return { ok: true as const };
      try {
        const next = updateProject(id, patch);
        if (next) setProject(next);
        return { ok: true as const };
      } catch (e) {
        if (e instanceof StorageQuotaError) {
          return { ok: false as const, error: 'quota' as const };
        }
        throw e;
      }
    },
    [id],
  );

  return { project, save };
}
