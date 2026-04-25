// Overlay locale-specific translated strings onto a template's props.
//
// The auto-translate pipeline (Chrome Translator API on the editor's AR
// toggle) writes its results into `Project.localizedText.ar` keyed by
// FieldDescriptor.path. This helper takes those translations and folds
// them into a fresh copy of `props` so the Scene can render the AR
// variant without any awareness of the localization layer — same scene
// code, same prop shape, just with translated strings substituted.
//
// Why props mutation rather than per-field hooks:
//   - Zero scene-level changes. Every existing template inherits AR
//     support without touching scene.tsx.
//   - Round-trips through the existing `useFieldFormat(path, base)`
//     pipeline cleanly — the Aa drawer's typography overrides apply on
//     top of the translated string, not the original.
//   - Manual edits while AR is active (typed into the Properties panel)
//     overwrite the same `localizedText.ar[path]` entry — symmetric
//     with how auto-translate fills it.

import { getPath, setPath } from './path';
import type { FieldDescriptor, ProductListSubField } from '../templates/fields';

/** Walks `fields` and, for every text-shaped path that has a non-empty
 *  entry in `localized`, writes the translated value onto a clone of
 *  `props`. Untranslated paths and non-text fields pass through
 *  untouched. The original `props` is not mutated. */
export function applyLocalizedText<P extends Record<string, unknown>>(
  props: P,
  fields: FieldDescriptor[],
  localized: Record<string, string> | undefined,
): P {
  if (!localized || Object.keys(localized).length === 0) return props;

  let out = props;
  for (const field of fields) {
    if (field.kind === 'text') {
      // Skip fields explicitly opted out (proper nouns, codes, etc.).
      if (field.noTranslate) continue;
      const translated = localized[field.path];
      if (typeof translated === 'string' && translated.length > 0) {
        out = setPath(out, field.path, translated);
      }
    } else if (field.kind === 'productList') {
      // Each product row is a per-index path: `<list>.<i>.<subPath>`.
      // We don't know the row count from the field descriptor alone, so
      // peek at the live array on `props` and iterate up to its length.
      const list = getPath(out, field.path);
      if (!Array.isArray(list)) continue;
      for (let i = 0; i < list.length; i += 1) {
        for (const sub of field.productFields as ProductListSubField[]) {
          if (sub.kind !== 'text' || sub.noTranslate) continue;
          const subPath = `${field.path}.${i}.${sub.path}`;
          const translated = localized[subPath];
          if (typeof translated === 'string' && translated.length > 0) {
            out = setPath(out, subPath, translated);
          }
        }
      }
    }
  }
  return out;
}

/** Inverse of `applyLocalizedText` — walks `fields` and pulls every
 *  translatable string out of `props` into a flat `Record<path, string>`.
 *  Used by the auto-translate batch caller as the "source set" to feed
 *  into the Chrome Translator API. Skips empty strings, `noTranslate`
 *  fields, and non-text kinds (colors, images, sections). */
export function collectTranslatableStrings<P extends Record<string, unknown>>(
  props: P,
  fields: FieldDescriptor[],
): Record<string, string> {
  const out: Record<string, string> = {};

  // A handful of patterns we never translate even when noTranslate isn't
  // set explicitly: Roman numerals, pure numerics, single chars, punctu-
  // ation. These hit no API and skip the round trip entirely.
  const skip = (s: string): boolean => {
    const trimmed = s.trim();
    if (trimmed.length === 0) return true;
    if (trimmed.length === 1) return true;
    if (/^[\dIVXLCDM,.\-—·:/]+$/u.test(trimmed)) return true;
    return false;
  };

  for (const field of fields) {
    if (field.kind === 'text') {
      if (field.noTranslate) continue;
      const v = getPath(props, field.path);
      if (typeof v === 'string' && !skip(v)) out[field.path] = v;
    } else if (field.kind === 'productList') {
      const list = getPath(props, field.path);
      if (!Array.isArray(list)) continue;
      for (let i = 0; i < list.length; i += 1) {
        for (const sub of field.productFields as ProductListSubField[]) {
          if (sub.kind !== 'text' || sub.noTranslate) continue;
          const subPath = `${field.path}.${i}.${sub.path}`;
          const v = getPath(props, subPath);
          if (typeof v === 'string' && !skip(v)) out[subPath] = v;
        }
      }
    }
  }
  return out;
}
