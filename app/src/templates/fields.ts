// Field descriptors: the editor's properties panel renders from this list.
// Each template exports its own FieldDescriptor[] describing which props
// are surfaced to the marketer and what control to draw.

export type FieldDescriptor =
  | { kind: 'section'; label: string }
  | {
      kind: 'text';
      path: string;
      label: string;
      placeholder?: string;
      multiline?: boolean;
    }
  | { kind: 'color'; path: string; label: string }
  | {
      kind: 'image';
      path: string;
      label: string;
      /** Aspect ratio hint for the preview thumbnail (e.g. 16/9, 1). Default 1. */
      aspectRatio?: number;
      hint?: string;
    }
  | {
      kind: 'productList';
      path: string;
      label: string;
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
