// EN→AR translation router.
//
// Two providers, in priority order:
//
//   1. **Chrome built-in `Translator` API** — runs Gemini Nano on-device
//      in Chrome 138+ / Edge. Free, offline, fast (~5-30 ms per phrase).
//      Requires the user to have either the API auto-shipped or the
//      `chrome://flags/#translation-api` flag enabled, plus the
//      "Optimization Guide On Device Model" component installed.
//
//   2. **MyMemory REST API** — `https://api.mymemory.translated.net/get`.
//      Free up to 50 000 words/day per IP (with email registered),
//      1 000 words/day anonymous. Works in any browser (Safari, Firefox,
//      older Chrome, Chrome without flags). Slower (~200-500 ms per
//      call due to network), but no setup. Used as fallback when the
//      Chrome built-in isn't available.
//
// We pick the first available provider at app start (Chrome → MyMemory
// → unavailable) and stick with it for the session. Both expose the
// same TranslatorInstance shape internally so the rest of the app
// doesn't care which one is active. The status pill surfaces the
// active provider so marketers can see whether they're on-device or
// going through the cloud.

/** State of the EN→AR translator on this device. Drives the AR toggle's
 *  loading indicators and disabled state. */
export type TranslatorState =
  | { kind: 'available'; provider: 'chrome' | 'mymemory' }
  | { kind: 'downloadable' }
  | { kind: 'downloading'; progress: number /* 0-1 */ }
  | {
      kind: 'unavailable';
      reason: 'no-api' | 'pair-not-supported' | 'error';
      /** Captured error message when reason='error'. Surfaced in the
       *  status pill tooltip so the marketer can see what blew up
       *  ("Permission denied", "Model not yet downloaded", etc.). */
      detail?: string;
    };

type TranslatorInstance = {
  translate(input: string): Promise<string>;
  destroy?: () => void;
};

// ── Chrome built-in provider ──────────────────────────────────────────

type ChromeTranslatorGlobal = {
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

function getChromeTranslator(): ChromeTranslatorGlobal | null {
  const g = (globalThis as { Translator?: ChromeTranslatorGlobal }).Translator;
  return typeof g === 'object' && g && typeof g.availability === 'function'
    ? g
    : null;
}

// ── MyMemory REST provider (fallback) ─────────────────────────────────

/** Hit MyMemory's free GET endpoint.
 *
 *  Response shape (when 200 OK):
 *    { responseData: { translatedText: string, match: number },
 *      responseStatus: 200 | 403 | 429,
 *      ... }
 *
 *  When the API rate-limits us (responseStatus 429) or the key is
 *  invalid (403), `translatedText` typically contains an English
 *  error message. We detect those and surface them as failures so
 *  the caller can fall back to the original EN string. */
async function myMemoryTranslate(text: string): Promise<string> {
  // `de` (the email) is optional but unlocks the higher 50 k words/day
  // quota. Leaving blank for now — the anonymous 1 000/day is plenty
  // for editor preview use; we'd swap in a real address before a
  // multi-tenant prod rollout.
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', 'en|ar');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const json = (await res.json()) as {
    responseStatus?: number | string;
    responseData?: { translatedText?: string };
  };
  const status = Number(json.responseStatus ?? 0);
  if (status >= 400) {
    throw new Error(
      `MyMemory status ${status}: ${json.responseData?.translatedText ?? '(no detail)'}`,
    );
  }
  const out = json.responseData?.translatedText;
  if (!out) throw new Error('MyMemory returned no translatedText');
  // MyMemory occasionally returns the EN string verbatim when its
  // memory has no match — that's still a valid response (better than
  // nothing) so we don't error.
  return out;
}

function makeMyMemoryInstance(): TranslatorInstance {
  return {
    translate: myMemoryTranslate,
  };
}

// ── Coordinator ───────────────────────────────────────────────────────

let _state: TranslatorState = { kind: 'unavailable', reason: 'no-api' };
let _instance: TranslatorInstance | null = null;
let _initPromise: Promise<TranslatorInstance | null> | null = null;
const _stateListeners = new Set<(s: TranslatorState) => void>();

function setState(next: TranslatorState) {
  _state = next;
  for (const fn of _stateListeners) fn(next);
}

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

/** Pre-warm whichever provider works on this device. Called once on
 *  Editor mount.
 *
 *  Order:
 *    1. Try Chrome built-in. If `availability` returns 'available'
 *       or 'downloadable' / 'downloading', use it.
 *    2. Otherwise (no API, or 'unavailable' for the pair, or create
 *       fails), fall back to MyMemory — which is always available
 *       as long as the network reaches the host.
 *
 *  Idempotent: repeat calls return the same in-flight promise. */
export function prewarmTranslator(): Promise<TranslatorInstance | null> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const chrome = getChromeTranslator();
    console.log('[translate] prewarm start', {
      hasChromeApi: !!chrome,
      ua: navigator.userAgent,
    });

    // ── Try Chrome built-in first ──
    if (chrome) {
      try {
        const avail = await chrome.availability({
          sourceLanguage: 'en',
          targetLanguage: 'ar',
        });
        console.log('[translate] chrome availability =', avail);
        if (avail !== 'unavailable') {
          if (avail === 'downloadable' || avail === 'downloading') {
            setState({ kind: 'downloading', progress: 0 });
          }
          const inst = await chrome.create({
            sourceLanguage: 'en',
            targetLanguage: 'ar',
            monitor(m) {
              m.addEventListener('downloadprogress', (e) => {
                const ev = e as Event & { loaded?: number };
                const loaded = typeof ev.loaded === 'number' ? ev.loaded : 0;
                console.log(
                  '[translate] download progress',
                  `${(loaded * 100).toFixed(1)}%`,
                );
                setState({ kind: 'downloading', progress: loaded });
              });
            },
          });
          _instance = inst;
          console.log('[translate] chrome ready');
          setState({ kind: 'available', provider: 'chrome' });
          return inst;
        }
        console.log(
          '[translate] chrome reported unavailable for en→ar; falling back to MyMemory',
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          '[translate] chrome init failed; falling back to MyMemory:',
          msg,
        );
      }
    }

    // ── MyMemory fallback ──
    // Quick connectivity probe: a single short translation. If it
    // succeeds we mark the provider available; if it fails we go
    // unavailable with the actual error in `detail` so the marketer
    // sees a real message ("Failed to fetch" / "MyMemory HTTP 503").
    try {
      const probe = await myMemoryTranslate('Hello');
      console.log('[translate] mymemory ready, probe =', probe);
      _instance = makeMyMemoryInstance();
      setState({ kind: 'available', provider: 'mymemory' });
      return _instance;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[translate] mymemory probe failed:', msg);
      setState({ kind: 'unavailable', reason: 'error', detail: msg });
      _initPromise = null; // allow future Retry to re-attempt
      return null;
    }
  })();
  return _initPromise;
}

/** Manually re-attempt initialisation. Used by the "Retry" affordance
 *  in the editor's translate-status pill when the previous attempt
 *  errored. Resets cached state and triggers a fresh prewarm. */
export function retryTranslator(): Promise<TranslatorInstance | null> {
  console.log('[translate] manual retry');
  _instance = null;
  _initPromise = null;
  setState({ kind: 'unavailable', reason: 'no-api' });
  return prewarmTranslator();
}

/** Translate a flat `Record<path, string>` from EN to AR. Returns a
 *  parallel record where each key maps to its translation; failed
 *  individual translations fall back to the original EN string so the
 *  scene still renders something legible. */
export async function translateBatch(
  source: Record<string, string>,
): Promise<Record<string, string>> {
  const inst = _instance ?? (await prewarmTranslator());
  if (!inst) {
    console.warn('[translate] batch skipped — no instance');
    return {};
  }

  const paths = Object.keys(source);
  console.log(`[translate] batch start (${paths.length} fields)`);
  const t0 = performance.now();
  const out: Record<string, string> = {};
  for (const [path, text] of Object.entries(source)) {
    try {
      out[path] = await inst.translate(text);
    } catch (err) {
      console.warn(`[translate] failed for "${path}":`, err);
      out[path] = text;
    }
  }
  const dt = (performance.now() - t0).toFixed(0);
  console.log(`[translate] batch done in ${dt}ms`);
  return out;
}

/** Test seam — reset module state between e2e suites. Not used in app. */
export function _resetTranslatorForTests() {
  _instance = null;
  _initPromise = null;
  _state = { kind: 'unavailable', reason: 'no-api' };
  _stateListeners.clear();
}
