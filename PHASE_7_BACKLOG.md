# Phase 7 backlog — landed + still-deferred items

This was the polish pass after Phases 3–6. What's checked has shipped to
local `main`; what's unchecked is deferred to a later pass (no promised
timeline, capture requests here as they come up).

Last updated: Phase 7 commit landed — see local `main` history.

---

## From Phase 3 — Safe-zone template retrofit aftermath

- [ ] **#1. Truncated entry animations.** CTAs that slide up from below
      the canvas now stop at `safe.bottom` instead of `0`, shortening
      the slide distance. Retune per-template timing / easing to feel
      the same at the new stop point. _Visual QA needed._
- [ ] **#2. Broken element pairings.** Rank-dots ↔ CTA slab (Bestsellers),
      kicker ↔ headline rhythm (Seasonal final), companion strip ↔ hero
      (Brand Spotlight). Shifted independently. Re-group into blocks
      where pairings matter.
- [ ] **#3. Orphaned decoration.** Edge-anchored gradients / radials
      now mismatch inset foreground. Re-anchor or extend bleed.
- [x] **#4. Lookbook Act 4 outro stack rhythm.** _Assessed, closed as
      not-an-issue._ The lockup is already wrapped in a single
      positioned `<div>` at `top: h(640)`; the CTA's `safe.bottom`
      shift only tightens the gap from 572 → 472px at 9:16, which is
      visually fine, not broken.
- [ ] **#5. Aspect-specific quirks.** Audit 9 templates × 3 aspects ×
      safe-zone ON/OFF for cramping or unused space. Iterative visual
      work.

---

## From Phase 4 — Brand Kit editor surfaces

- [x] **#6. Brand-color-aware typography samples.** _Closed as
      misnotation._ BrandKit.tsx Typography tiles already render
      samples in `var(--editor-text)` (editor chrome colors), not
      hardcoded hex. No brand-color-bound samples to fix.

---

## From Phase 5 — Per-field format drawer

- [ ] **#7. Lookbook / Editorial / Countdown / Hero — remaining
      un-wired fields.** Primary CTA + main headlines + kickers now
      wired in Phase 7. **Still unwired** (long-tail decorative text
      where format-drawer changes have no visible effect):
        - Lookbook: `act2Kicker`, `act2TitleLine1/2`, `ctaFooter`,
          `watermark`, boutiqueName.
        - Editorial: `masthead`, `issueDate`, `byline`, `closingKicker`,
          `signatureText`, `boutiqueName`, `ctaFooter`.
        - Countdown: `body`, `endsText`, `terms`, `boutiqueName`,
          `ctaFooter`.
        - Hero: `product.name`, `product.category`, `boutiqueName`,
          `ctaFooter`.
      The `Aa` button still appears next to these in the Properties
      panel; clicking opens the drawer and changes save, but the
      corresponding scene element keeps its inline style. Diminishing
      returns on these — marketer most-edits are on the primary
      headline + CTA which are now wired.
- [ ] **#8. Per-product sub-field formatting.** Fields inside
      `productList` (per-row name / price / brandline) still don't
      have format buttons. Indexed paths change on reorder. Needs
      a stable per-row id as the override key.
- [x] **#9. Brand-accent reactivity in `useFieldFormat` bases.**
      _Done in Phase 7a._ Seasonal, Gift Guide, and Brand Spotlight
      now destructure `colors` before the hook calls and pass the
      live brand colors (`colors.accent`, `colors.ink`, `colors.cream`)
      into the hook bases. Un-overridden fields now update when the
      brand palette changes.
- [ ] **#10. Drawer: template-default swatch alongside override.**
      Visual diff between "template intent" and "current override"
      would make reset decisions clearer.
- [x] **#11. Family dropdown shows font samples.** _Done in Phase 7a._
      The drawer's family picker is now a vertical radio-group where
      each family name renders in its own family (display italic for
      display role, normal for body, RTL for Arabic). Live comparison
      before selection. Active family shows an "ACTIVE" chip.

---

## Displaced per-project overrides (original Phase 5 scope)

- [ ] **#12. Per-project safe-zone override.** Section on Properties
      panel — per-aspect inputs inheriting from brand kit.
- [ ] **#13. Per-project typography override.** Per-role family/weight
      override on a single ad.
- [x] **#14. Per-project locale override.** _Landed in Phase 6e._
      Segmented EN / AR at top of editor, stored as
      `project.localeOverride`, composes with brand default.

---

## From Phase 6 — Arabic / RTL

- [x] **#15. Currency-suffix composition.** _Done in Phase 7b._ New
      `lib/price.ts` with `composePrice(raw, currency)` +
      `useCurrencyForLocale()`. 5 templates now render prices with
      locale-appropriate currency suffix (AED / د.إ.) composed from
      the brand kit's `currencyByLocale[locale]`. Non-destructive:
      strips known currency trails (AED / SAR / BHD / KWD / QAR / OMR
      / USD / EUR / GBP + Arabic abbreviations) before appending the
      new one. No schema migration.
- [ ] **#16. Safe-zone overlay pill mirror in RTL.** "SAFE · 9:16"
      pill always reads LTR. When overlay is shown in an RTL-locale
      ad, flip to top-right or leave LTR on aesthetic grounds.

---

## Nice-to-haves (still un-phased)

- [ ] **#17. Custom font uploader.** Dropped at Phase 1.5. Comes back
      if the boutique licenses a second paid family.
- [ ] **#18. "No safe zone" export preset surfaced in aspect picker.**
      `9:16-no-chrome` preset exists in the data model but isn't
      pickable. Add to aspect switcher or export modal.
- [ ] **#19. Drawer keyboard navigation.** Arrow keys between fields
      would help power users.

---

## Closed summary for Phase 7

Landed:
- #4 (closed as not-an-issue)
- #6 (closed as misnotation)
- #9 (brand-color reactivity)
- #11 (family samples)
- #14 (was closed in Phase 6e)
- #15 (currency composition)
- Partial #7 (primary CTAs + main headlines wired in the 4 original
  templates — long-tail fields remain)

Still open: #1, #2, #3, #5, partial-#7, #8, #10, #12, #13, #16, #17, #18, #19.

The **still-open items** fall into three buckets:
1. **Visual QA** (#1, #2, #3, #5) — need eyes-on iteration, not blind
   code changes.
2. **Further template wiring** (partial-#7, #8, #10) — tedious, low
   marginal value after the primary fields are formatted.
3. **Out-of-scope / nice-to-have** (#12, #13, #16, #17, #18, #19) —
   worthwhile but not blocking; pull forward if marketers request.
