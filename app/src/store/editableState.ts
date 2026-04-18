// The slice of Project that the Editor treats as "user-editable and
// should participate in undo/redo". Excludes immutable (id, templateId,
// createdAt) and out-of-history metadata (name — edited separately via
// input blur, updatedAt — server/timestamp metadata).

import type { Project } from './types';

export type EditableState = {
  props: unknown;
  aspectIndex: number;
  duration: number;
  videoClipStartSec: number;
  backgroundTrackId: string | null;
  musicVolume: number;
  musicAnchorVideoTime: number;
  musicTrimStartSec: number;
  musicEndVideoTime: number;
};

export function projectToEditable(p: Project): EditableState {
  return {
    props: p.props,
    aspectIndex: p.aspectIndex,
    duration: p.duration,
    videoClipStartSec: p.videoClipStartSec,
    backgroundTrackId: p.backgroundTrackId,
    musicVolume: p.musicVolume,
    musicAnchorVideoTime: p.musicAnchorVideoTime,
    musicTrimStartSec: p.musicTrimStartSec,
    musicEndVideoTime: p.musicEndVideoTime,
  };
}

/** Shallow-equal two EditableStates. `props` is identity-compared
 *  (our updates always produce new references). */
export function editablesEqual(a: EditableState, b: EditableState): boolean {
  return (
    a.props === b.props &&
    a.aspectIndex === b.aspectIndex &&
    a.duration === b.duration &&
    a.videoClipStartSec === b.videoClipStartSec &&
    a.backgroundTrackId === b.backgroundTrackId &&
    a.musicVolume === b.musicVolume &&
    a.musicAnchorVideoTime === b.musicAnchorVideoTime &&
    a.musicTrimStartSec === b.musicTrimStartSec &&
    a.musicEndVideoTime === b.musicEndVideoTime
  );
}

/** Everything in EditableState — passed to `updateProject(id, patch)`. */
export function editableToPatch(e: EditableState): Partial<Project> {
  return {
    props: e.props,
    aspectIndex: e.aspectIndex,
    duration: e.duration,
    videoClipStartSec: e.videoClipStartSec,
    backgroundTrackId: e.backgroundTrackId,
    musicVolume: e.musicVolume,
    musicAnchorVideoTime: e.musicAnchorVideoTime,
    musicTrimStartSec: e.musicTrimStartSec,
    musicEndVideoTime: e.musicEndVideoTime,
  };
}
