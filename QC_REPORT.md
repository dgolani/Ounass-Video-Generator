# Template QC Report — DEEP behavioral audit

**Date:** 2026-04-25
**Scope:** All 14 templates audited against a 9-point behavior-tracing checklist that traces every `useFieldFormat` hook through the JSX, verifies spread order, checks for hardcoded inline overrides, catches every silent path mismatch, and validates per-product (productList) wildcard hook coverage.
**Method:** 5 parallel deep-static-analysis agents, each tracing 2-3 templates end-to-end.

This supersedes the earlier shallow QC. The shallow pass missed silent bugs because it didn't trace where each hook's result actually got applied.

---

## TL;DR

| Status | Count | Templates |
|---|---|---|
| ✅ Fully clean | 1 | **Countdown** |
| ⚠ Has bugs | 13 | All others |
| **Total bugs** | **~64** | (across 13 templates) |

**Five repeating patterns account for every bug found.** Fix the patterns, the bug count collapses to ~6 unique remediation strokes:

1. **`boutiqueName` Aa drawer dead-ends at BoutiqueLogo.** The component doesn't accept a typography override, so the marketer's "Aa" button on the boutique-name field has nothing to write to. Affects every template with a logo lockup. **One component fix + per-template wiring.**
2. **Per-product (productList) wildcard hooks missing.** Most templates render `{product.name}` etc. with hardcoded inline styles, never going through `useFieldFormat('products.*.X', …)`. Aa buttons on per-row fields silently do nothing. Affects ~10 templates.
3. **Hardcoded inline styles bypassing the hook layer.** Specific text fields in Seasonal, Carousel, Brand-Spotlight, Gift-Guide, The Stack, The Collab, The Rail render with `style={{ fontFamily: …, fontSize: … }}` directly instead of through a hook. Drawer overrides skip them entirely.
4. **Orphan single-field hooks.** A handful of fields exist in `fields.ts` but have no matching `useFieldFormat` call — Lookbook `act2TitleLine2`, Carousel `titleLine2`, Gift-Guide `headLine2`, Seasonal `word2`/`word3`, The Stack `sealWord1`/`2`/`3` + `bylineItalic`, The Collab `editSmallRight` + `capsuleTag2`/`3`.
5. **`composePrice` missing in themed templates.** Already known from the prior shallow QC. The Pairing, The Collab, New In, The Rail render raw `{product.price}` without locale-aware currency suffix.

Plus one outlier:
- Hero CTA button has a spread-order bug — `color: ctaTextStyle.color ?? colors.background` AFTER `...ctaTextStyle` makes the drawer's color override conditionally lose.

---

## Per-template breakdown

### Group A — Legacy core (Phase 3)

#### Lookbook — 4 bugs
1. `act2TitleLine2` rendered with `act2TitleStyle` (which is the hook for `act2TitleLine1`). Marketer's Aa edit on line 2 silently affects line 1's style. — **scene.tsx:336**
2. `products.*.name` rendered with hardcoded inline style at scene.tsx:481. No wildcard hook. — Aa drawer dead.
3. `products.*.color` rendered with hardcoded inline style at scene.tsx:468.
4. `boutiqueName` passed to `<BoutiqueLogo>` with no typography hook wired.

#### Editorial — 4 bugs
1. `products.*.name` hardcoded inline style at scene.tsx:363.
2. `products.*.category` hardcoded inline style at scene.tsx:396.
3. `featureCaption` hardcoded inline style at scene.tsx:514. No hook at all.
4. `boutiqueName` Aa drawer dead-end at BoutiqueLogo (line 634).

#### Hero — 4 bugs
1. **Spread-order bug** — `style={{ ...ctaTextStyle, color: ctaTextStyle.color ?? colors.background }}` at scene.tsx:418-419 puts the conditional color AFTER the spread, so the drawer's color override loses when `ctaTextStyle.color` is undefined.
2. `product.name` hardcoded inline style at scene.tsx:316.
3. `product.category` hardcoded inline style at scene.tsx:304.
4. `boutiqueName` Aa drawer dead-end.

### Group B — Phase 2 expansion

#### Bestsellers — 1 bug
1. `boutiqueName` Aa drawer dead-end at BoutiqueLogo (scene.tsx:266).

#### Seasonal — 4 bugs
1. `word2` no hook. Field exists but only `word1` has `refrainStyle`. Aa edit on word2 has no path.
2. `word3` no hook. Same as word2.
3. `sideEditorialLine` hardcoded inline style at scene.tsx:456-471.
4. `seasonChip` hardcoded inline style at scene.tsx:524-533.

#### Carousel — 5 bugs
1. `categoryLabel` hardcoded inline style at scene.tsx:217-228.
2. `finalKicker` hardcoded inline style at scene.tsx:429-440.
3. `finalSubline` hardcoded inline style at scene.tsx:451-461.
4. `titleLine2` rendered as `<em>` inside a `titleLine1`-keyed parent. Aa on line 2 affects line 1 style.
5. **CRITICAL** — items.*.brandline / .name / .price all hardcoded inline at scene.tsx:317-352. Per-product Aa drawer dead across all carousel rows.

#### Brand Spotlight — 7 bugs
1. `presentsLabel` no hook.
2. `hero.brandline` hardcoded inline at scene.tsx:393.
3. `hero.name` hardcoded inline at scene.tsx:405.
4. `hero.price` hardcoded inline at scene.tsx:417.
5. `finalKicker` hardcoded inline at scene.tsx:545.
6. `finalMeta` hardcoded inline at scene.tsx:568.
7. `quoteAttrib` hardcoded inline at scene.tsx:503.

#### Gift Guide — 5 bugs
1. `headLine2` rendered with `headLineStyle` (hook for `headLine1`). Aa edit on line 2 affects line 1 style.
2. `boxLabel` hardcoded inline at scene.tsx:412-428.
3. `ribbonLabel` hardcoded inline at scene.tsx:524-544.
4. `footKicker` hardcoded inline at scene.tsx:560-572.
5. **CRITICAL** — picks.*.name / .sub hardcoded inline. Per-pick Aa drawer dead.

### Group C — Phase 6 themed lockups

#### The Stack — 9 bugs
1. `sealWord1`, `sealWord2`, `sealWord3` no hooks. SVG `<text>` elements at scene.tsx:714-738 render fields raw.
2. `bylineItalic` no hook (only inline `fontStyle: 'italic'`).
3. **CRITICAL** — All 4 plates × 5 sub-fields (`brand`, `indexLabel`, `origin`, `yearRoman`, `subheading`) hardcoded inline at scene.tsx:516-594. 20 unformattable text elements per template instance.

#### The Pairing — 5 bugs
1. `pieceA.price` rendered raw without `composePrice()`. — scene.tsx:668
2. `pieceB.price` rendered raw. — scene.tsx:712
3. `totalPrice` digit-slam splits raw string. — scene.tsx:800-814
4. `totalCurrency` hardcoded inline style at scene.tsx:817-828.
5. Digit-slam spans have only animation styles; per-digit Aa formatting impossible without container hook.

#### The Collab — 8 bugs
1. `editSmallRight` rendered with `editSmallStyle` (hook for `editSmallLeft`). Aa on right label affects left.
2. `capsuleTag2` rendered with `capsuleTagStyle` (hook for `capsuleTag1`). Aa edit silently wrong-routes.
3. `capsuleTag3` same as #2.
4. `products.*.category` hardcoded inline at scene.tsx:708.
5. `products.*.name` hardcoded inline at scene.tsx:723.
6. `products.*.price` hardcoded inline at scene.tsx:737.
7. Product price rendered raw without `composePrice()` — scene.tsx:737.

### Group D — Phase 6 themed edits

#### New In — 4 bugs
1. **CRITICAL** — All 5 productList sub-fields (`brand`, `name`, `price`, `recapPrice`, `category`) hardcoded inline. No wildcard hooks.
2. `p.price` rendered raw without `composePrice()` at scene.tsx:817.
3. `p.recapPrice` rendered raw at scene.tsx:918.
4. Product fields rendered with no hook spread regardless of value.

#### The Rail — 4 bugs
1. **CRITICAL** — All 4 productList sub-fields (`name`, `price`, `priceUnit`, `indexLabel`) no wildcard hooks.
2. `product.price` raw without `composePrice()` at scene.tsx:697.
3. Hero label `{heroProduct.price}` raw at scene.tsx:782.
4. `capsuleCount`, `capsuleWord1/2/3`, `editKicker`, `heroSizes` no hooks (5 capsule + hero editorial fields silent).

---

## Fix campaign

### Wave 1 — BoutiqueLogo accepts typography overrides
**Scope:** Component-level fix + thread `useFieldFormat('boutiqueName', baseStyle)` through every template's BoutiqueLogo call.
**Templates touched:** Lookbook, Editorial, Hero, Bestsellers, Carousel, Brand-Spotlight, Gift-Guide, Seasonal, The Stack, The Pairing, The Collab, New In, The Rail.
**Estimated:** 1 component change + 13 one-line scene additions.

### Wave 2 — composePrice for themed family
**Scope:** Wrap raw `{X.price}` renders with `composePrice(X.price, useCurrencyForLocale())`.
**Templates touched:** The Pairing (3 sites), The Collab (1), New In (2), The Rail (2).
**Estimated:** 1 commit, ~20 minutes.

### Wave 3 — Per-product wildcard hooks
**Scope:** Add `useFieldFormat('products.*.<field>', baseStyle)` (or `picks.*.X`, `items.*.X`, `plates.*.X`) for every productList sub-field. Spread the result into each inline render.
**Templates touched:** Lookbook (2 fields), Editorial (2), Hero (2), Carousel (3), Gift-Guide (2), The Stack (5), The Collab (3), New In (5), The Rail (4) — **28 fields total**.

### Wave 4 — Hardcoded inline → hook conversions
**Scope:** Convert orphan hardcoded inline styles to `useFieldFormat('<path>', base)` + spread.
**Templates touched:** Seasonal (2), Carousel (3), Brand-Spotlight (7), Gift-Guide (3), The Stack (3), The Rail (5) — **23 fields**.

### Wave 5 — Single-field orphan hooks
**Scope:** Add the missing `useFieldFormat` for fields that should have one but don't.
**Fields:** Lookbook `act2TitleLine2`; Carousel `titleLine2`; Gift-Guide `headLine2`; Seasonal `word2`+`word3`; The Stack `sealWord1`+`2`+`3`+`bylineItalic`; The Collab `editSmallRight`+`capsuleTag2`+`3`. **~13 fields.**

### Wave 6 — Hero CTA spread-order fix
Single-line change: move the conditional color BEFORE the spread.

---

## What remains clean (per the deep audit)

- **Countdown** — fully clean across all 9 checks.
- **No literal fontFamily strings** — all 14 templates use `var(--font-*)`.
- **Spread order** — only Hero has the conditional-color outlier; every other template is correct.
- **`useFieldColor('logo', …)` wiring** — every template wires `logoColor` to `<BoutiqueLogo color={logoColor} />`.
- **`composePrice` on legacy templates** — Lookbook, Bestsellers, Hero, Carousel, Brand-Spotlight all use it correctly.
- **Path-string match on top-level fields** — every `useFieldFormat('<P>', …)` matches a `path: '<P>'` in fields.ts (productList sub-fields are the missing surface).
- **`noTranslate` flags** — every boutique name, brand name, Roman numeral, and SKU code is correctly tagged.

The bugs cluster around two specific gaps in the conventions:
- **Per-product wildcard hooks** were not made mandatory in the original `template_skill.md`. Templates were free to render product text with whatever style. Fixing this becomes the convention going forward.
- **`BoutiqueLogo`** was designed before `useFieldFormat` existed and never updated to accept the override. One component change unlocks 13 templates.
