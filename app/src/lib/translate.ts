// Chrome built-in Translator API wrapper.
//
// Chrome 138+ exposes a `Translator` global that runs Gemini Nano on-
// device for translation. First use of a language pair triggers a one-
// time ~22 MB download; subsequent calls are instant and offline. We
// use it to fill `Project.localizedText.ar` when the marketer toggles
// the editor into Arabic.
//
// Browser support today (2026-04-25): Chrome stable + Edge. Safari and
// Firefox don't ship the API. `getTranslatorState()` returns
// `'unavailable'` on those — the editor's AR toggle still flips locale
// (so RTL + Noto Kufi kicks in) but no auto-translate runs. Marketer
// can still type Arabic by hand into the Properties panel; manual
// edits write to `localizedText.ar` directly via the regular setter
// path, so the same persistence loop works either way.
//
// Why a wrapper instead of inline calls:
//   - Single shared `Translator` instance per session — avoids
//     re-initialising the model on every batch.
//   - Single `availability()` check at app start (pre-warm), reused
//     by the toggle handler. Without this every AR click would hit
//     the API again.
//   - Graceful degradation surface: `getTranslatorState()` returns a
//     discriminated state the UI can pattern-match for messaging
//     ("Preparing Arabic… 14/22 MB", "Auto-translate works in
//     Chrome 138+. Type Arabic manually for now.", etc.).

/** State of the EN→AR translator on this device. Drives the AR toggle's
 *  loading indicators and disabled state. */
export type TranslatorState =
  | { kind: 'available' }
  | { kind: 'downloadable' }
  | { kind: 'downloading'; progress: number /* 0-1 */ }
  | { kind: 'unavailable'; reason: 'no-api' | 'pair-not-supported' | 'error' };

type TranslatorInstance = {
  translate(input: string): Promise<string>;
  destroy?: () => void;
};

type TranslatorGlobal = {
  availability(opts: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
  create(opts: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: EventTarget) => void;
  }): Promise<TranslatorInstance>;
};

function getTranslatorGlobal(): TranslatorGlobal | null {
  // The API is exposed on `self` in the main thread + workers.
  const g = (globalThis as { Translator?: TranslatorGlobal }).Translator;
  return typeof g === 'object' && g && typeof g.availability === 'function'
    ? g
    : null;
}

let _state: TranslatorState = { kind: 'unavailable', reason: 'no-api' };
let _instance: TranslatorInstance | null = null;
let _initPromise: Promise<TranslatorInstance | null> | null = null;
const _stateListeners = new Set<(s: TranslatorState) => void>();

function setState(next: TranslatorState) {
  _state = next;
  for (const fn of _stateListeners) fn(next);
}

/** Subscribe to state transitions (downloadable → downloading → available).
 *  Returns the unsubscribe function. The listener fires immediately with
 *  the current state. */
export function subscribeTranslatorState(
  listener: (s: TranslatorState) => void,
): () => void {
  _stateListeners.add(listener);
  listener(_state);
  return () => _stateListeners.delete(listener);
}

export function getTranslatorState(): TranslatorState {
  return _state;
}

/** Pre-warm the translator. Called once on Editor mount.
 *
 *  - If the API is missing → state stays `'unavailable'`. Cheap, exits.
 *  - If `available` → `Translator.create` is fast (no download).
 *  - If `downloadable` → triggers the ~22 MB language pack download in
 *    the background while the marketer continues to edit in EN.
 *
 *  Idempotent — repeat calls return the same in-flight promise. The
 *  first AR toggle awaits this promise instead of re-checking. */
export function prewarmTranslator(): Promise<TranslatorInstance | null> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const T = getTranslatorGlobal();
    if (!T) {
      setState({ kind: 'unavailable', reason: 'no-api' });
      return null;
    }
    try {
      const avail = await T.availability({
        sourceLanguage: 'en',
        targetLanguage: 'ar',
      });
      if (avail === 'unavailable') {
        setState({ kind: 'unavailable', reason: 'pair-not-supported' });
        return null;
      }
      if (avail === 'downloadable' || avail === 'downloading') {
        setState({ kind: 'downloading', progress: 0 });
      }
      const inst = await T.create({
        sourceLanguage: 'en',
        targetLanguage: 'ar',
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const ev = e as Event & { loaded?: number };
            const loaded = typeof ev.loaded === 'number' ? ev.loaded : 0;
            setState({ kind: 'downloading', progress: loaded });
          });
        },
      });
      _instance = inst;
      setState({ kind: 'available' });
      return inst;
    } catch (err) {
      // Net failure, permission denied, model corrupt — fall back.
      console.warn('[translate] prewarm failed', err);
      setState({ kind: 'unavailable', reason: 'error' });
      return null;
    }
  })();
  return _initPromise;
}

/** Translate a flat `Record<path, string>` from EN to AR. Returns a
 *  parallel record where each key maps to its translation; failed
 *  individual translations fall back to the original EN string so the
 *  scene still renders something legible.
 *
 *  Awaits `prewarmTranslator` if the instance isn't ready yet — so a
 *  click on the AR toggle while the language pack is mid-download
 *  works correctly: the call queues, resolves once the pack lands. */
export async function translateBatch(
  source: Record<string, string>,
): Promise<Record<string, string>> {
  const inst = _instance ?? (await prewarmTranslator());
  if (!inst) return {}; // unavailable — caller falls back to manual entry

  const out: Record<string, string> = {};
  // Translate sequentially. The on-device model is fast (~5-30 ms per
  // short phrase) but parallelising with Promise.all on a single
  // instance has no throughput benefit and risks ordering oddities.
  for (const [path, text] of Object.entries(source)) {
    try {
      out[path] = await inst.translate(text);
    } catch (err) {
      console.warn(`[translate] failed for "${path}":`, err);
      out[path] = text; // graceful: keep EN so layout doesn't break
    }
  }
  return out;
}

/** Test seam — reset module state between e2e suites. Not used in app. */
export function _resetTranslatorForTests() {
  _instance = null;
  _initPromise = null;
  _state = { kind: 'unavailable', reason: 'no-api' };
  _stateListeners.clear();
}
