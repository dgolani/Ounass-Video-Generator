# Archive — historical template code

Snapshots of `app/src/templates/` captured before large refactors, in case a prior state is worth referencing or restoring.

This folder is not in the app's build. It's here as tangible, filesystem-browseable history alongside git tags.

## Snapshots

### `templates-v1-pre-safe-cleanup/`

Captured just before the "always-safe" cleanup (2026-04-24 onwards). State of the 9 templates at that moment:

- Full content-rect pattern on Seasonal + Bestsellers (post-polish).
- Legacy `Math.max(h(X), safe.edge + h(Y))` pattern still in place on Hero, Countdown, Brand Spotlight, Gift Guide, Carousel, Editorial, Lookbook.
- Logo-tint override (`useFieldColor`) wired on all 9 templates.
- Wildcard product formatting + global image-scale slider (Bestsellers as reference adoption).
- `meta.aspects[]` includes 9:16, 4:5, 1:1 — 1:1 was dropped in the cleanup.
- `SafeZoneEnforcementContext` still gated the render — dropped in the cleanup (safe toggle in editor becomes a pure overlay-visibility switch).

If you need any individual file from this state: `diff _archive/templates-v1-pre-safe-cleanup/<path> app/src/templates/<path>` to compare, or copy from the archive. The git tag **`templates-v1-pre-safe-cleanup`** (run `git show templates-v1-pre-safe-cleanup`) points at the same commit.

## Adding a new snapshot

When taking a backup before a large template refactor:

```bash
cp -R app/src/templates _archive/templates-<label>/
git tag templates-<label>
```

Then add a bullet under "## Snapshots" describing what was captured and why.

## Cleanup

Old snapshots can be deleted once we're confident we don't need them; git tags preserve the full history. Rule of thumb: keep the last 2–3 snapshots.
