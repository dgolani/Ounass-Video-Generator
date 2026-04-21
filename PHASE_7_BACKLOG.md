# Phase 7 backlog — landed + still-deferred items

This was the polish pass after Phases 3–6. What's checked has shipped to
local `main`; what's unchecked is deferred to a later pass (no promised
timeline, capture requests here as they come up).

Last updated: Phase 7c — full text-field wiring + a11y/UX niceties.

---

## From Phase 3 — Safe-zone template retrofit aftermath

- [x] **#1. Truncated entry animations.** _Assessed in Phase 7c, closed
      as no-code-regression._ Code audit of all 5 non-original templates
      (bestsellers, seasonal, brand-spotlight, gift-guide, carousel)
      confirmed CTA slide distances (30–80 px) are proportionate to their
      new `safe.bottom`-anchored targets. Re-open if a marketer reports
      an actual snap-feel; don't tweak blindly.
- [x] **#2. Broken element pairings.** _Assessed in Phase 7c, closed
      as no-code-regression._ Bestsellers rank-dots ↔ CTA slab, Seasonal
      final kicker ↔ headline (flex-gapped), Brand Spotlight companion
      strip ↔ hero — all reviewed. Pairings are either shared-parent
      flex groups or intentionally layered with independent anchors.
      Re-open on a reported visual drift; don't regroup blindly.
- [x] **#3. Orphaned decoration.** _Assessed in Phase 7c, closed as
      no-code-regression._ Template backgrounds use `inset: 0` radial
      or linear gradients — canvas-centered or center-anchored, not
      foreground-aligned. Gift-guide's `at 50% 100%` bronze wash is
      dimmed by the editor safe-zone overlay but renders as intended in
      the export (overlay is editor-only). No fixes needed.
- [x] **#4. Lookbook Act 4 outro stack rhythm.** _Assessed, closed as
      not-an-issue._ The lockup is already wrapped in a single
      positioned `<div>` at `top: h(640)`; the CTA's `safe.bottom`
      shift only tightens the gap from 572 → 472px at 9:16, which is
      visually fine, not broken.
- [ ] **#5. Aspect-specific quirks.** Audit 9 templates × 3 aspects ×
      safe-zone ON/OFF for cramping or unused space. Iterative visual
      work — genuinely needs eyes on each cell of the matrix; can't be
      closed by code-read alone. Deferred until a marketer reports
      a specific aspect/safe combination that feels off.

---

## From Phase 4 — Brand Kit editor surfaces

- [x] **#6. Brand-color-aware typography samples.** _Closed as
      misnotation._ BrandKit.tsx Typography tiles already render
      samples in `var(--editor-text)` (editor chrome colors), not
      hardcoded hex. No brand-color-bound samples to fix.

---

## From Phase 5 — Per-field format drawer

- [x] **#7. Lookbook / Editorial / Countdown / Hero — remaining
      un-wired fields.** _Closed in Phase 7c_ — every drawer-visible
      text field in the 4 originals now runs through `useFieldFormat`
      (commit `dfa4317`):
        - Lookbook: `act2Kicker`, `act2TitleLine1/2`, `ctaFooter`,
          `watermark`.
        - Editorial: `masthead`, `issueDate`, `byline`, `closingKicker`,
          `signatureText`, `ctaFooter`.
        - Countdown: `body`, `endsText`, `terms`, `subhead` (body-scale
          rendering), `ctaFooter`.
        - Hero: `ctaFooter`.
      `boutiqueName` is intentionally not wired — it renders via the
      shared `<BoutiqueLogo>` which either swaps in a logo SVG or
      fallback-renders the name with role-bound brand typography; no
      per-field drawer surface for it. `product.name` / `product.category`
      fall under #8 (per-product sub-field formatting) — excluded by
      scope.
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
- [x] **#10. Drawer: template-default swatch alongside override.**
      _Done in Phase 7c._ FormatDrawer now shows a two-row Preview at
      the top: "Default" (role-typical reference — Cormorant Garamond
      for display, Inter for body, Noto Serif for numeric, Noto Kufi
      for Arabic) rendered in a subdued tone, and "Your override" in
      full colour, only when at least one property is overridden.
      Documented compromise: the swatch uses role-typical defaults
      rather than the exact per-template base style (which would need
      a big threading refactor to surface into the drawer). Good enough
      as a reset reference.
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
- [x] **#16. Safe-zone overlay pill mirror in RTL.** _Done in Phase 7c._
      `SafeZoneOverlay` now calls `isRTL(useLocale())` and pins the
      "Safe · 9:16" pill to `top-right` in RTL scenes. The tech label
      itself keeps `direction: ltr` so the aspect stays readable as
      `9:16` rather than `61:9`.

---

## Nice-to-haves (still un-phased)

- [ ] **#17. Custom font uploader.** Dropped at Phase 1.5. Comes back
      if the boutique licenses a second paid family.
- [x] **#18. "No safe zone" export preset surfaced in aspect picker.**
      _Done in Phase 7c._ Surfaced in the **Export modal** (not the
      aspect picker — "no chrome" isn't an aspect, it's a destination
      modifier). An info panel now shows the current state with
      plain-English destination hints ("Instagram/TikTok ready" vs
      "edge-to-edge (WhatsApp/DOOH/email)") and a one-click toggle.
- [x] **#19. Drawer keyboard navigation.** _Done in Phase 7c._ Arrow
      Up/Down and `j` / `k` walk through the Format drawer's text-field
      stack in drawer-list order; the handler ignores keypresses while
      an input/textarea/contenteditable is focused so typing is never
      intercepted. `Esc` closes the drawer (already wired). The in-drawer
      hint line surfaces the shortcuts.

---

## Closed summary for Phase 7

Landed across 7a / 7b / 7c:
- #1, #2, #3 (closed as no-code-regression after audit)
- #4 (closed as not-an-issue)
- #6 (closed as misnotation)
- #7 (full text-field wiring in the 4 originals)
- #9 (brand-color reactivity)
- #10 (drawer default-swatch preview)
- #11 (family samples)
- #14 (was closed in Phase 6e)
- #15 (currency composition)
- #16 (RTL pill mirror)
- #18 (no-chrome export preset)
- #19 (drawer keyboard nav)

Still open: #5, #8, #12, #13, #17.

The **still-open items** fall into two buckets:
1. **Needs eyes-on** (#5) — aspect × safe-zone matrix audit, genuinely
   iterative.
2. **Explicitly deferred / nice-to-have** (#8, #12, #13, #17) — out of
   scope for this pass; pull forward if marketers request.
