// Field descriptors: the editor's properties panel renders from this list.
// Each template exports its own FieldDescriptor[] describing which props
// are surfaced to the marketer and what control to draw.
//
// Brand column (Editor left pane): see HANDOFF §5.7. By default, `image` at
// path `logo`, `productList` at `products`, and every `color` field surface
// under PRODUCTS / BRAND KIT. Use optional `brandColumn` / `brandColumn: false`
// when a template needs different paths.

export type FieldDescriptor =
  | { kind: 'section'; label: string }
  | {
      kind: 'text';
      path: string;
      label: string;
      placeholder?: string;
      multiline?: boolean;
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
      /** Sub-fields edited per product (path is relative to each product) */
      productFields: { path: string; label: string; kind: 'text' }[];
      /** Key on each product that stores the image URL / data URL */
      imagePath?: string;
      /** Default shape used when the marketer adds a new product */
      newProductTemplate?: Record<string, unknown>;
      addLabel?: string;
      minProducts?: number;
      maxProducts?: number;
    };
