---
name: qc-fix
description: Run QC + auto-fix on a single template. Always asks the user which template to verify, then chains qc-tester → template-fixer → re-verify until clean.
---

You are orchestrating a build → QC → fix cycle for **one template at a time**. The marketer (or whoever invoked this) wants a specific template verified and fixed; never assume which one.

## Step 1 — Ask which template

If the user passed a template name as `$ARGUMENTS` (e.g. `/qc-fix the-stack`), use it directly and skip to Step 2.

Otherwise, **always ask the user which template**. Present the 14 options grouped by gallery category so the choice is easy:

```
Which template should I QC + fix?

  Edit (multi-product):
    1. lookbook
    2. editorial
    3. bestsellers
    4. carousel
    5. gift-guide
    6. new-in
    7. the-rail

  Single piece:
    8. hero
    9. brand-spotlight

  Moment:
    10. countdown
    11. seasonal

  Lockup:
    12. the-stack
    13. the-pairing
    14. the-collab

  Or "all" to loop through every template (one at a time).

Reply with a number, slug, or "all".
```

Wait for their reply. If they say "all", run Steps 2–4 sequentially for each template (don't parallelize — you want to see each report before moving on, and the same dev preview can only QC one template's editor URL at a time).

## Step 2 — Hand off to qc-tester

Invoke the `qc-tester` subagent with:

```
Run a deep behavior-tracing QC on the <slug> template. Use TEST_CASES.md
§2 (per-template smoke) plus the relevant §1 (common behavior) cases.
Run all 22 deep checks documented in your agent prompt. Capture
screenshots at 4 keyframes for visual sampling. Return the structured
report.
```

Wait for the qc-tester's report.

## Step 3 — Decide whether to fix

Inspect the qc-tester's report:

- **If `❌ Bugs (0)`** — print the report's summary, congratulate the user, stop. No fixes needed.
- **If `❌ Bugs (Y)`** — proceed to Step 4.
- **If the report itself failed** (preview not running, file unreadable, slug ambiguous) — surface the blocker to the user and stop.

## Step 4 — Hand off to template-fixer

Invoke the `template-fixer` subagent with:

```
Apply the fixes listed in the QC report below to template <slug>.
Verify with `tsc --noEmit && npm run build` after each cluster of
fixes. Spot-check visually. Return a fix report.

QC report:
<paste the qc-tester's full report here>
```

Wait for the fixer's report.

## Step 5 — Re-verify

Once the fixer reports clean tsc + build, **re-run qc-tester** on the same slug to confirm every bug is resolved.

If the re-verify shows **0 bugs** — print a green summary, ask the user whether to commit + push.

If the re-verify shows **new or remaining bugs**:
- If first re-run, hand back to template-fixer with the new report. Loop.
- If second re-run still shows bugs, **stop and escalate to the user**. Don't loop indefinitely. Show:
  - The current QC report
  - The list of attempted fixes
  - Specifically which bugs are sticky and why the fixer can't resolve them

Hard cap: **3 fix attempts per template**. After that, the user decides whether to investigate manually, defer the bug to a backlog, or accept the partial fix.

## Step 6 — Commit (only after explicit user approval)

When QC is green, ASK before committing:

```
QC clean for <slug>. Y bugs fixed:
  - <one-line summary per fix>

Ready to commit + push as a single logical commit?
[yes / no / let me review the diff first]
```

If yes, run:

```bash
cd /Users/dgolani/Documents/Claude\ Projects/VideoAds
git diff --stat   # show the user what's about to land
git add app/src/templates/<slug>/ app/src/templates/BoutiqueLogo.tsx  # only files actually touched
git commit -m "<descriptive message that lists which bugs were fixed>"
git push origin main
```

If "let me review", show `git diff` instead of committing — let the user decide.

If "no", leave changes uncommitted and stop. The user can commit themselves later.

## Behavioral rules

- **Never skip the "which template" question** unless `$ARGUMENTS` is non-empty. The whole point of this command is per-template precision.
- **Run agents sequentially**, not in parallel. The dev preview is a single shared resource; concurrent QC on different templates corrupts the navigation state.
- **Show the user the full qc-tester report** before invoking the fixer — they may want to triage which bugs to fix before letting you loose.
- **Hard cap on fix attempts**. 3 strikes and you escalate. Loop forever ≠ autonomous; it's "stuck pretending to work".
- **Always check + push needs explicit approval**. The git policy in MEMORY.md says no pushes without ask.
- **Halt clearly** when something blocks you — preview not up, no slug provided, qc-tester reports a non-bug error, etc. Surface "I can't do X because Y" rather than guessing.
