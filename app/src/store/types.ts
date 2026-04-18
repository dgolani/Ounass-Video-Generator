export type Project = {
  id: string;
  name: string;
  templateId: string;
  props: unknown;
  aspectIndex: number;
  duration: number;
  /** Global timeline position (s) where the edited video clip begins; playback length is `duration`. */
  videoClipStartSec: number;
  /** `null` = video only */
  backgroundTrackId: string | null;
  /** 0–1, applied at export + preview */
  musicVolume: number;
  /** When on the video timeline music begins (seconds). */
  musicAnchorVideoTime: number;
  /** Skip this many seconds from the start of the audio file (preview + export). */
  musicTrimStartSec: number;
  /** Video time where the music bed ends (exclusive tail is silent). Default = full video. */
  musicEndVideoTime: number;
  createdAt: number;
  updatedAt: number;
};
