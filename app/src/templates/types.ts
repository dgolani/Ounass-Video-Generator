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

export type TemplateMeta<P> = {
  id: string;
  name: string;
  description: string;
  defaultDuration: number;
  aspects: AspectRatio[];
  scenes: SceneOutline[];
  defaultProps: P;
  /** When true, this template ships BOTH a light and a dark palette
   *  (schema.colors is shaped `{ light, dark }`) and the editor
   *  surfaces a Light | Dark toggle that flips the active mode. The
   *  project persists the user's choice in `project.themeMode`. */
  supportsThemes?: boolean;
};
