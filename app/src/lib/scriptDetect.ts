// Unicode-block helpers for the locale copy-mismatch warning.
//
// The warning fires when the active locale's expected script doesn't
// match the majority script of the marketer's editable strings. It's a
// soft guardrail — Arabic-locale ads rendered with mostly Latin copy
// almost certainly reflect an un-translated draft, so the editor
// surfaces a yellow chip nudging the marketer to translate.
//
// Classification is intentionally coarse: we only distinguish "Arabic
// script glyphs" from "Latin script glyphs" and ignore punctuation,
// digits, and whitespace — those are shared across scripts. A 60%
// threshold prevents false positives on short kickers (e.g. "NEW IN"
// in an Arabic ad is fine; a 40-word English paragraph in an Arabic
// ad is not).

const ARABIC_RANGES: Array<[number, number]> = [
  [0x0600, 0x06ff], // Arabic
  [0x0750, 0x077f], // Arabic Supplement
  [0xfb50, 0xfdff], // Arabic Presentation Forms-A
  [0xfe70, 0xfeff], // Arabic Presentation Forms-B
];

const LATIN_RANGES: Array<[number, number]> = [
  [0x0041, 0x005a], // A-Z
  [0x0061, 0x007a], // a-z
  [0x00c0, 0x024f], // Latin-1 Supplement + Latin Extended-A/B
  [0x1e00, 0x1eff], // Latin Extended Additional
];

function inAnyRange(code: number, ranges: Array<[number, number]>): boolean {
  for (const [lo, hi] of ranges) {
    if (code >= lo && code <= hi) return true;
  }
  return false;
}

/** Summary of the scripts present in a string. Counts are of *distinct*
 *  classified characters (digits / whitespace / punctuation excluded). */
export type ScriptSummary = {
  arabic: number;
  latin: number;
  total: number;
};

/** Classify every character of `s` into Arabic / Latin / other, return
 *  counts. Does not short-circuit — accurate per-call. */
export function summariseScripts(s: string): ScriptSummary {
  let arabic = 0;
  let latin = 0;
  let total = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code == null) continue;
    const isArabic = inAnyRange(code, ARABIC_RANGES);
    const isLatin = inAnyRange(code, LATIN_RANGES);
    if (!isArabic && !isLatin) continue; // skip digits, whitespace, punctuation
    total += 1;
    if (isArabic) arabic += 1;
    else latin += 1;
  }
  return { arabic, latin, total };
}

/** Aggregate scripts across multiple strings (e.g. every text field in
 *  a template's props) into a single summary. Short strings contribute
 *  proportionally to the total — this is intentional, longer body copy
 *  should outweigh a one-word kicker. */
export function summariseScriptsAcross(strings: Array<string | undefined>): ScriptSummary {
  let arabic = 0;
  let latin = 0;
  let total = 0;
  for (const s of strings) {
    if (!s) continue;
    const sub = summariseScripts(s);
    arabic += sub.arabic;
    latin += sub.latin;
    total += sub.total;
  }
  return { arabic, latin, total };
}

/** Returns a copy-safety warning when the summary strongly disagrees
 *  with the intended locale. `null` = no warning (everything's aligned
 *  or there's too little text to decide). Thresholds:
 *    - `total < 20` → too little to judge (avoid nagging on new ads)
 *    - Arabic locale + Latin-majority (>60%) → warn
 *    - English locale + Arabic-majority (>60%) → warn (symmetric) */
export function copyMismatchWarning(
  locale: 'en' | 'ar',
  summary: ScriptSummary,
): string | null {
  if (summary.total < 20) return null;
  const latinPct = summary.total === 0 ? 0 : summary.latin / summary.total;
  const arabicPct = summary.total === 0 ? 0 : summary.arabic / summary.total;

  if (locale === 'ar' && latinPct > 0.6) {
    return `Locale is Arabic but copy is mostly Latin (${Math.round(latinPct * 100)}%). Did you mean to translate?`;
  }
  if (locale === 'en' && arabicPct > 0.6) {
    return `Locale is English but copy is mostly Arabic (${Math.round(arabicPct * 100)}%). Did you mean to flip locale?`;
  }
  return null;
}

/** Walk an arbitrary props object and collect every string leaf. Used
 *  by the warning to summarise a template's full editable copy in one
 *  go without the caller enumerating individual field paths.
 *
 *  - Strings are included directly.
 *  - Arrays and objects are recursed.
 *  - Non-string primitives (number / boolean) are ignored.
 *  - `depth` cap prevents accidental infinite recursion on cyclic shapes. */
export function collectStringLeaves(node: unknown, depth = 0): string[] {
  if (depth > 12) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) {
    const out: string[] = [];
    for (const item of node) out.push(...collectStringLeaves(item, depth + 1));
    return out;
  }
  if (node && typeof node === 'object') {
    const out: string[] = [];
    for (const v of Object.values(node)) {
      out.push(...collectStringLeaves(v, depth + 1));
    }
    return out;
  }
  return [];
}
