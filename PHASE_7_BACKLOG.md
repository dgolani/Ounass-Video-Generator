# Phase 7 backlog — alignment + animation polish + loose ends

Everything we deferred during Phases 3–6 so the final polish pass has
a single source of truth. Grouped by the phase where it was introduced,
not the phase where it's fixed (all get fixed in Phase 7).

Last updated: after Phase 5 merge (commit `4d35294`).

---

## From Phase 3 — Safe-zone template retrofit

When the editor's safe-zone toggle is ON (or in preview cards / exports,
which always enforce), content anchors shift inward. Several templates
weren't tuned for that reflowed layout. Fix in Phase 7:

1. **Truncated entry animations.** CTAs that slide up from `y = below-
   canvas` now stop at `safe.bottom` instead of `0`, shortening the
   slide distance and making the easing feel abrupt. Retune per-template.

2. **Broken element pairings.** Rank dots → CTA slab gap in Bestsellers;
   kicker → headline rhythm in Seasonal's final frame; companion strip
   → hero product card in Brand Spotlight. Each pair shifted
   independently, now the spacing looks off. Re-group into shifted
   blocks where it matters.

3. **Orphaned decoration.** Some gradients / radials / seams anchor to
   the canvas edge while the foreground pulled inward. Inset the
   decoration to match, OR extend it further off-edge so the bleed
   is intentional.

4. **Stack rhythm breaks in Lookbook Act 4.** The outro stack is
   kicker → wordmark → tagline → CTA. Currently only the CTA is
   anchored to `safe.bottom`; the three above it follow the original
   design. That breaks the rhythm when content should lift as a block.

5. **Aspect-specific quirks.** 4:5 has safe 120/200, 1:1 has 100/100,
   9:16 has 250/300. Templates designed for 9:16 margins may look fine
   at 9:16 but cramped at 1:1 where the safe zone eats less of the
   canvas. Audit all 9 templates × 3 aspects × [enforce on / off].

---

## From Phase 4 — Brand Kit editor surfaces

6. **Brand-color-aware typography samples.** The live samples in the
   Typography tiles use hardcoded color values (e.g. `#B87253`) rather
   than reading `brand.colors.accent` / etc. If Faizan changes the
   brand accent, the samples don't update. Swap the hardcoded values
   for reads from the brand context.

---

## From Phase 5 — Per-field format drawer

7. **Lookbook / Editorial / Countdown / Hero — partial wiring.** Only
   the primary CTA (+ a couple of key headlines) are refactored to use
   `useFieldFormat`. The other text fields in these four templates
   show the "Aa" button but clicking it and changing values has no
   visible effect — the template's inline styles still render. Wire
   every remaining text element:
     - **Lookbook**: `kicker` (Act 1), `tagline` (Act 1),
       `act2Kicker`, `act2TitleLine1/2`, `outroKicker`,
       `boutiqueName`, `ctaFooter`, `watermark`.
     - **Editorial**: `masthead`, `issueDate`, `headlineLine1/2`,
       `byline`, `closingKicker`, `signatureText`, `boutiqueName`,
       `ctaFooter`.
     - **Countdown**: `kicker`, `headline`, `subhead`, `body`,
       `endsText`, `terms`, `boutiqueName`, `ctaFooter`.
     - **Hero**: `preTitle`, `headlineLine1/2`, `subhead`,
       `product.name`, `product.category`, `product.price`,
       `boutiqueName`, `ctaFooter`.

8. **Per-product sub-field formatting.** Fields inside `productList`
   (per-row `name`, `price`, `brandline`) don't have format buttons.
   Indexed paths change when products reorder, so the override has
   to key on something stable (product id?). Design + wire.

9. **Brand-accent reactivity in `useFieldFormat` base values.** Several
   templates pass hardcoded colors (e.g. `color: '#B87253'`) into the
   `useFieldFormat` base because I wrote them before the scene's
   `colors` destructure. If the brand accent changes, fields that
   haven't been overridden still render the hardcoded color. Rewrite
   each base to reference the live `colors.*` values.

10. **Drawer doesn't preview template default next to override.** The
    sample inside the drawer renders the current (possibly overridden)
    style. Showing a "template default" swatch alongside would make
    the diff obvious and "reset" more intentional.

11. **Family dropdown doesn't show family samples.** Dropdown shows
    plain family names as text; each row should render the family
    name in the family itself so marketers can see the face before
    selecting it.

---

## Displaced per-project overrides (original Phase 5 plan)

These were scoped out when Phase 5 became the rich format drawer. They
give marketers brand-kit-parity controls *per ad* (not per field). Worth
landing in Phase 7 if there's capacity, or as a dedicated follow-up:

12. **Per-project safe-zone override.** Collapsible section on the
    Properties panel: per-aspect top/bottom/left/right inputs,
    inherits brand kit until the marketer flips an "Override for this
    ad" toggle. Data lives on `project.props.safeZoneOverride`.

13. **Per-project typography override.** Same pattern, one toggle per
    role (display/body/numeric/arabic). Lets a campaign pick a
    different headline face without flipping the brand default.

14. **Per-project locale override.** Surfaced in Phase 6 as a toggle in
    the Properties panel — this item is closed the moment 6e ships.

---

## From Phase 6 — Arabic / RTL (will fill in as issues surface)

_(Add bidi fixes discovered during the per-template Arabic validation
pass. Expected categories: side markers that should mirror, icon
positions that must flip, `letterSpacing` negative values that need
inversion for Arabic text.)_

15. **Currency-suffix composition.** `BrandKit.currencyByLocale` exists
    but templates render prices like `"1,890 AED"` where the currency
    is baked into the string. To have prices localize (`AED` in English
    → `د.إ.` in Arabic), template schemas need to split amount + currency
    and compose at render time. That's a breaking change for saved
    projects — needs a migration. Deferred to Phase 7.

16. **Safe-zone overlay doesn't mirror in RTL.** The "SAFE · 9:16" pill
    in the overlay's top-left always reads left-to-right. When
    validating RTL templates, the pill should flip to the top-right
    or stay LTR as-is — TBD on aesthetic preference.

---

## Nice-to-haves (un-phased, optional)

17. **Custom font uploader.** Dropped at Phase 1.5 because Portrait is
    vendored. If the boutique ever licenses a second paid family, this
    comes back — not a blocker.

18. **"No safe zone" export preset surfaced in the aspect picker.** The
    `9:16-no-chrome` preset exists in the data model since Phase 2 but
    isn't surfaced in the aspect switcher UI. Add as a fourth entry
    or as an "Export" modal option.

19. **Drawer: keyboard navigation between fields.** Current drawer is
    mouse-driven; arrow keys in the drawer could jump to the next /
    previous formattable field for power users.
