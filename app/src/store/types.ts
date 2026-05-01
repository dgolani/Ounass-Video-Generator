import type { FieldFormatOverrides } from './fieldFormat';
import type { Locale } from '../engine/locale';
import type { ThemeMode } from '../engine/themeMode';

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
  /** Per-field typography + style overrides keyed by FieldDescriptor.path.
   *  Added in Phase 5. Optional — pre-Phase-5 projects load with an empty
   *  map injected by the project reader. */
  fieldFormatOverrides?: FieldFormatOverrides;
  /** Per-project locale override. When set, the editor renders this ad
   *  in the given locale regardless of the brand kit's default. Useful
   *  for producing the Arabic variant of a specific ad without flipping
   *  the entire brand. `undefined` = follow the brand default. */
  localeOverride?: Locale;
  /** For templates with supportsThemes: true, this holds the marketer's
   *  Light | Dark choice. Ignored for unthemed templates. `undefined`
   *  means "use template default" (light). */
  themeMode?: ThemeMode;
  /** Cached non-English translations of this project's editable text
   *  fields, keyed by FieldDescriptor.path → translated string. Filled
   *  by the Chrome Translator API on the first AR toggle and reused on
   *  subsequent toggles so re-flipping is instant. Manual edits while
   *  the AR locale is active write back to the same map.
   *
   *  Today only `'ar'` is populated; the shape leaves room for other
   *  locales without a migration. */
  localizedText?: { ar?: Record<string, string> };
  /** Project-level full-bleed background — either a hosted video URL
   *  OR an uploaded image data URL (mutually exclusive). Renders as a
   *  sibling layer behind the rasterized canvas so it never taints
   *  the export, and templates no longer need their own backdrop
   *  field. Mirrors the music layer's anchor / trim / end semantics
   *  for the video case so the marketer can drag and trim it on the
   *  timeline exactly like a music track.
   *
   *  `undefined` = no project background; templates fall back to
   *  their internal paper / gradient art. */
  background?: ProjectBackground;
  createdAt: number;
  updatedAt: number;
};

/** Shape of `Project.background`. Discriminated by `kind`. */
export type ProjectBackground =
  | {
      kind: 'image';
      /** Image data URL (uploaded) or hosted URL. */
      src: string;
      /** 0–1 — black overlay opacity over the image, parity with the
       *  video case. Default 0 (image not dimmed). */
      dim: number;
    }
  | {
      kind: 'video';
      /** Hosted video URL (mp4 / webm / mov). */
      src: string;
      /** 0–1 — black overlay opacity over the video. Default 0.24 to
       *  match the historical Reel default. */
      dim: number;
      /** When on the project timeline (seconds) the video begins. */
      anchorVideoTime: number;
      /** Skip this many seconds from the start of the source file. */
      trimStartSec: number;
      /** Project timeline second where the video ends (clipped tail
       *  is replaced by the underlying scene chrome). Default = end
       *  of project. */
      endVideoTime: number;
    }
  | {
      kind: 'color';
      /** Hex `#RRGGBB` (or `#RGB` / `#RRGGBBAA`) solid backdrop. The
       *  marketer picks via the color drawer; default is `#000000`.
       *  No dim layer applies — pick a darker shade if you wanted
       *  dimming. */
      color: string;
    };
