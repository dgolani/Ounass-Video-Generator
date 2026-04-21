// Price-composition helper — strips a known currency suffix from a raw
// price string and appends the locale-appropriate one from the brand kit.
//
// Use case: templates store prices as literal strings ("1,890 AED") today.
// When a marketer flips the editor's locale toggle to Arabic, every price
// should render with "د.إ." instead of "AED" — without marketers having
// to edit each price field by hand or migrating every saved project's
// schema.
//
// `composePrice("1,890 AED", "د.إ.")` → `"1,890 د.إ."`
// `composePrice("٢,١٠٠ د.إ.", "AED")`  → `"٢,١٠٠ AED"`
// `composePrice("3,240",      "AED")`  → `"3,240 AED"`  (no existing suffix)
//
// Supported suffixes are the GCC currencies the boutique might stock in
// (AED, SAR, BHD, KWD, QAR, OMR) plus the three majors (USD, EUR, GBP)
// and their Arabic abbreviations. Extend the list as new markets onboard.

import { useMemo } from 'react';
import { useLocale } from '../engine/locale';
import { useBrand } from '../store/brand';

/** Known Latin currency codes that might trail a price string. Case-
 *  insensitive; optional trailing period tolerated ("AED" or "AED."). */
const LATIN_CURRENCY_TRAIL =
  /[\s\u00A0]+(AED|SAR|BHD|KWD|QAR|OMR|USD|EUR|GBP)\.?\s*$/i;

/** Known Arabic currency abbreviations that might trail. Each is two or
 *  three letters with dots, optionally followed by punctuation. */
const ARABIC_CURRENCY_TRAIL =
  /[\s\u00A0]+(د\.إ\.|ر\.س\.|د\.ب\.|د\.ك\.|ر\.ق\.|ر\.ع\.)\s*$/;

/** Strip any known currency suffix from the input. Returns just the
 *  numeric part (with thousands separators / decimals intact). */
export function stripCurrencySuffix(price: string): string {
  return price
    .replace(LATIN_CURRENCY_TRAIL, '')
    .replace(ARABIC_CURRENCY_TRAIL, '')
    .trim();
}

/** Compose a final price display string: amount + suffix from the brand
 *  kit's `currencyByLocale[locale]`. Non-destructive — if the raw string
 *  already has the desired suffix, the output is effectively unchanged. */
export function composePrice(
  rawPrice: string,
  currency: string,
): string {
  const amount = stripCurrencySuffix(rawPrice);
  if (!currency) return amount;
  return `${amount} ${currency}`;
}

/** React hook — compose a price for the current active locale. Observes
 *  LocaleContext (set by the Editor or the BrandLocaleBridge) and the
 *  brand-kit `currencyByLocale` map so any change reflows immediately. */
export function usePrice(rawPrice: string | undefined | null): string {
  const locale = useLocale();
  const [brand] = useBrand();
  return useMemo(() => {
    if (!rawPrice) return '';
    const suffix = brand.currencyByLocale[locale] ?? '';
    return composePrice(rawPrice, suffix);
  }, [rawPrice, locale, brand.currencyByLocale]);
}

/** React hook — return just the locale-appropriate currency suffix.
 *  Templates with many prices (Bestsellers, Lookbook, Carousel) call
 *  this once at the top and then `composePrice(p, currency)` per-item
 *  inline, avoiding N hook calls inside a map. */
export function useCurrencyForLocale(): string {
  const locale = useLocale();
  const [brand] = useBrand();
  return brand.currencyByLocale[locale] ?? '';
}
