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
};

export type FieldDescriptor =
  | { kind: 'section'; label: string }
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
    }
  | {
      kind: 'color';
      path: string;
      label: string;
      /** When false, keep this swatch on the right Properties panel only (default: show in BRAND KIT). */
      brandColumn?: boolean;
    }
  | {
      kind: 'image';
      path: string;
      label: string;
      /** When true, show in left BRAND KIT even if path is not `logo` (default: only `path === 'logo'`). */
      brandColumn?: boolean;
      /** Aspect ratio hint for the preview thumbnail (e.g. 16/9, 1). Default 1. */
      aspectRatio?: number;
      hint?: string;
      /** Restrict uploads to SVG only. Stored as a `data:image/svg+xml`
       *  URL and recoloured by templates via CSS mask-image. Use for
       *  boutique/brand logos. */
      svgOnly?: boolean;
    }
  | {
      kind: 'productList';
      path: string;
      label: string;
      /** When true, show in left PRODUCTS even if path is not `products`. */
      brandColumn?: boolean;
      /** When the playhead is in any of these scene ids, emphasize the whole product list */
      sceneIds?: string[];
      /** Scene id per row index (`[idx] === activeScene` highlights that product card). */
      productRowSceneIds?: string[];
      /** Sub-fields edited per product (path is relative to each product) */
      productFields: ProductListSubField[];
      /** Key on each product that stores the image URL / data URL */
      imagePath?: string;
      /** Default shape used when the marketer adds a new product */
      newProductTemplate?: Record<string, unknown>;
      addLabel?: string;
      minProducts?: number;
      maxProducts?: number;
    };
