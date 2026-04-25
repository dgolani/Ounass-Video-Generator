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
  createdAt: number;
  updatedAt: number;
};
