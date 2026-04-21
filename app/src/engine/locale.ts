// Locale context — carries the active locale from the brand kit (or from
// a per-project override) down to every scene so templates can respond
// to RTL / Arabic without prop drilling.
//
// Resolution tiers (high wins):
//   1. project.props.localeOverride  (per-ad choice — Phase 6e)
//   2. brand.locale                   (boutique-wide default — Phase 4)
//   3. 'en'                           (hardcoded fallback)
//
// Scenes don't need to know the tiers — they just call `useLocale()` and
// get the resolved string. The Editor populates the Provider with the
// composed value; preview cards and exports observe the default ('en'
// unless the Editor explicitly provides Arabic, which matches what
// marketers see when they leave the brand kit in English mode).

import { createContext, useContext } from 'react';

/** Supported locales. Extend as the boutique expands into new markets
 *  (fr, es, hi); each needs its own typography role fallback + currency
 *  suffix in the brand kit. */
export type Locale = 'en' | 'ar';

/** True when the locale uses a right-to-left writing system. Today only
 *  `ar`; expressed as a helper so the conditional is readable inline. */
export function isRTL(locale: Locale): boolean {
  return locale === 'ar';
}

/** Context default is `'en'`. Every route mounts a provider fed by
 *  `useBrand()` + the project's `localeOverride` (when inside the
 *  editor). Scenes + previews observe it automatically. */
export const LocaleContext = createContext<Locale>('en');

/** React hook — read the active locale. Returns `'en'` unless overridden
 *  by a Provider above. */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** React hook — convenience for the "direction" CSS prop. Scenes spread
 *  this onto their root container so every descendant inherits RTL. */
export function useLocaleDirection(): 'ltr' | 'rtl' {
  return isRTL(useContext(LocaleContext)) ? 'rtl' : 'ltr';
}
