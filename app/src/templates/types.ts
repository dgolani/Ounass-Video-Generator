// Shared template types. Every template imports these; no template should
// define its own version (early Phase-3 leak — TemplateMeta used to live
// inside phillip-lim/meta.ts, which made Phillip Lim an implicit parent
// of every other template. Lifting it here breaks that circular feel).

export type AspectRatio = {
  label: string;
  width: number;
  height: number;
};

export type SceneOutline = {
  id: string;
  label: string;
  start: number;
  end: number;
};

/** Coarse gallery categorisation — lets the marketer filter the growing
 *  template library ("Edit", "Lockup", etc.) instead of scrolling 14+
 *  cards. Deliberately small; add a new category only when we have 2+
 *  templates that warrant one, otherwise park the new template in the
 *  closest existing bucket. */
export type TemplateCategory =
  /** Single hero product or designer feature — one subject. */
  | 'single'
  /** Multi-product edits — carousels, lookbooks, grids, rails. */
  | 'edit'
  /** Time-bound or event-driven campaigns (countdown, seasonal). */
  | 'moment'
  /** Brand / product lockups — pairs, collabs, house stacks. */
  | 'lockup';

export type TemplateMeta<P> = {
  id: string;
  name: string;
  description: string;
  defaultDuration: number;
  aspects: AspectRatio[];
  scenes: SceneOutline[];
  defaultProps: P;
  /** Gallery filter bucket. See TemplateCategory for the four buckets. */
  category: TemplateCategory;
  /** When true, this template ships BOTH a light and a dark palette
   *  (schema.colors is shaped `{ light, dark }`) and the editor
   *  surfaces a Light | Dark toggle that flips the active mode. The
   *  project persists the user's choice in `project.themeMode`. */
  supportsThemes?: boolean;
  /** Optional dynamic-duration hook. When defined, the editor
   *  auto-syncs `project.duration` to whatever this returns whenever
   *  the marketer edits any field — so templates with variable-length
   *  scene logic (e.g. The Reel - Modular's heading-products variant
   *  whose length scales with the product count) can guarantee the
   *  full template runtime fits without the marketer manually
   *  bumping the project duration. The returned value is clamped to
   *  the project's allowed [MIN, MAX] range before being applied. */
  computeDuration?: (props: P) => number;
};
