// Field descriptors: the editor's properties panel renders from this list.
// Each template exports its own FieldDescriptor[] describing which props
// are surfaced to the marketer and what control to draw.
//
// Brand column (Editor left pane): see HANDOFF §5.7. By default, `image` at
// path `logo`, `productList` at `products`, and every `color` field surface
// under PRODUCTS / BRAND KIT. Use optional `brandColumn` / `brandColumn: false`
// when a template needs different paths.

/** Typography role a text field belongs to in the template's design.
 *  Drives the Format drawer's family dropdown — a "kicker" labelled
 *  `role: 'body'` shows only body-role families (Portrait, Inter,
 *  DM Sans, Nunito Sans), so marketers can't accidentally pick a
 *  display serif for a small uppercase chip.
 *
 *  When omitted, the drawer defaults to `'body'` as the safest
 *  assumption (most inline text is body-weight in our templates).
 *  Headlines, refrains, and hero wordmarks should be explicitly
 *  `'display'`; prices/countdowns `'numeric'`; Arabic-script fields
 *  can declare `'arabic'` so the drawer shows RTL-friendly options.
 */
export type FieldRole = 'display' | 'body' | 'numeric' | 'arabic';

/** Sub-field rows inside a `productList` control */
export type ProductListSubField = {
  path: string;
  label: string;
  kind: 'text';
  /** When the playhead is in any of these `meta.scenes[].id`s, emphasize this row */
  sceneIds?: string[];
  /** Typography role for the per-field Format drawer. See FieldRole. */
  role?: FieldRole;
  /** When true, the auto-translate pass on AR locale skips this row. Use
   *  for proper nouns (brand names like "Gucci"), price strings (already
   *  routed through composePrice), Roman numerals, and SKU-like codes. */
  noTranslate?: boolean;
};

/** Optional discriminated `showWhen` predicate available on every field
 *  kind. The PropertiesPanel evaluates this against the live props
 *  object before rendering — when it returns false, the descriptor is
 *  skipped entirely. Use this for templates with variant selectors
 *  (e.g. The Reel - Modular's per-scene type switch) where some fields
 *  only make sense for one variant. The predicate is passed the entire
 *  props blob so it can inspect any field, not just adjacent ones. */
export type ShowWhenPredicate = (props: Record<string, unknown>) => boolean;

export type FieldDescriptor =
  | { kind: 'section'; label: string; showWhen?: ShowWhenPredicate }
  | {
      kind: 'text';
      path: string;
      label: string;
      placeholder?: string;
      multiline?: boolean;
      /** When the playhead is in any of these `meta.scenes[].id`s, emphasize this field */
      sceneIds?: string[];
      /** Typography role for the per-field Format drawer. See FieldRole. */
      role?: FieldRole;
      /** When true, the auto-translate pass on AR locale skips this field. */
      noTranslate?: boolean;
      showWhen?: ShowWhenPredicate;
    }
  | {
      kind: 'color';
      path: string;
      label: string;
      brandColumn?: boolean;
      showWhen?: ShowWhenPredicate;
    }
  | {
      kind: 'image';
      path: string;
      label: string;
      brandColumn?: boolean;
      aspectRatio?: number;
      hint?: string;
      svgOnly?: boolean;
      acceptVideo?: boolean;
      showWhen?: ShowWhenPredicate;
    }
  | {
      kind: 'slider';
      path: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      hint?: string;
      precision?: number;
      showWhen?: ShowWhenPredicate;
    }
  | {
      kind: 'select';
      path: string;
      label: string;
      options: { value: string; label: string }[];
      hint?: string;
      showWhen?: ShowWhenPredicate;
    }
  | {
      kind: 'productList';
      path: string;
      label: string;
      brandColumn?: boolean;
      sceneIds?: string[];
      productRowSceneIds?: string[];
      productFields: ProductListSubField[];
      imagePath?: string;
      newProductTemplate?: Record<string, unknown>;
      addLabel?: string;
      minProducts?: number;
      maxProducts?: number;
      showWhen?: ShowWhenPredicate;
    };
