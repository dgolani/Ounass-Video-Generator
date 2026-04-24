# ACCOUNT_HANDOFF — Ounass Cutroom

**Audience:** a Claude agent running under a different Anthropic account than the one that built this project. Memory files in `~/.claude/projects/…` are account-scoped and **do not transfer** — so anything that was implicit memory has been written down here. **Read this file top-to-bottom before doing any work.** When it says "see HANDOFF.md §N," go read that section. That's your real engineering reference; this file is the bridge.

If you are the same account that built the project, you still benefit from this file on a fresh machine — but your account memory will also carry the pieces below (git policy, roadmap location, build decisions). On a new account, this file is the only source of truth for those.

---

## 0. One-minute orient

- **Product:** Ounass Cutroom — *Cut. Brand. Ship.* Browser-only React + TypeScript video-ad generator. Marketer picks a template → edits in-browser → exports an MP4. No backend, no login, free-tier Vercel hostable.
- **Project lives at:** `/Users/dgolani/Documents/Claude Projects/VideoAds/`
- **The app lives at:** `/Users/dgolani/Documents/Claude Projects/VideoAds/app/` (Vite + React 19 + TS)
- **GitHub remote:** `https://github.com/dgolani/Ounass-Video-Generator.git` (default branch `main`)
- **Today's state:** Phases 0–7c complete. 9 templates ship. Last commit on `origin/main` is `3d3e9bf` (`template_skill: bring in line with Phases 2–7 template contract`). Working tree should be clean.

---

## 1. Standing user rules (these persisted across every session, re-establish them now)

These rules came from prior sessions' memory (account-scoped, not transferred). **Treat them as binding until the user explicitly revises them.**

1. **Never `git push` to `origin` without an explicit ask.** Local commits are fine; only publishing to the remote needs permission. Set by user 2026-04-21. When the user says *"push it"* / *"push the code to git"* / similar, that IS the explicit ask — proceed. Absent that instruction, commit locally and stop.

2. **Don't silently drift from locked build decisions.** These are settled and not up for redebate without explicit flag to the user:
   - **Stack:** Vite + React + TypeScript. Locked Phase 0.
   - **Customization depth:** Tier 1 — text / images / products / colors / logo / duration / aspect. Tier 2 (per-act timing/easing) is deferred behind a future "Advanced" disclosure. Tier 3 (add/reorder/remove acts) is deferred indefinitely.
   - **Export pipeline:** Client-only frame-by-frame → `ffmpeg.wasm` → MP4. No MediaRecorder, no server-side headless render, no WebM intermediate.
   - **No SKU importer** — Kasada blocks `/product/findbysku`. See HANDOFF §9 Gotcha #4.
   - **No backend** — localStorage only; single browser; no auth, no accounts.

3. **Phased work lives in `ROADMAP.md` at the project root.** Read it at the start of any session that might interact with phase scope. Companion docs: `PHASE_7_BACKLOG.md` for current open items, `HANDOFF.md` for engineering conventions.

4. **Maintain the handoff docs in the same change as the code.** If you change a convention, add a gotcha, or finish a phase: update HANDOFF.md (and ROADMAP.md / PHASE_7_BACKLOG.md where relevant) in the same commit. Look for `MAINTENANCE — update §N when you…` banners in HANDOFF.md.

---

## 2. Required reading order (before you touch code)

1. **This file** (ACCOUNT_HANDOFF.md) — standing rules + current state + pointers.
2. **HANDOFF.md** — full engineering reference. Read §0 TL;DR → §3 Mental model → §5 Conventions (all of it — §5.9–§5.14 are the post-Phase-5 additions that most template ports need) → §6 Recipe: add a new template → §9 Gotchas. Skim the rest.
3. **ROADMAP.md** — phased history with rationale. Reads as a project diary; most useful when you need to understand *why* a decision was made.
4. **PHASE_7_BACKLOG.md** — canonical list of what's still open. Every item is labeled `#N` and closed-or-open. Never duplicate an existing item.
5. **template_skill.md** — the template-author contract (role-bound typography, safe-zone anchoring, `useFieldFormat` wiring, `composePrice`, `data-export-ignore`). Read this whenever you're asked to add a new template or port one from an HTML preview.
6. **SAFE_ZONE_PATTERNS.md** — the deep dive for composition-preserving safe-zone anchoring (content-rect model, element patterns, gotchas). Read alongside HANDOFF §5.9 and the safe-zone section of `template_skill.md` whenever you author OR polish a template.

If the user drops you into a task before you've read 2–4, still read them. A five-minute read saves an hour of re-discovering conventions.

---

## 3. Project snapshot (as of 2026-04-22)

**Phases complete:** 0 through 7c. The phase numbering is **two-era**:
- **Era 1 (Phases 0–5b)** from the original ROADMAP.md: Foundation → Editor shell → Customization depth → Multi-template → Export → Audio + layered timeline.
- **Era 2 (Phases 1–7c, independent numbering that lives in git commit prefixes)**: Typography tokens → Font vendoring → Safe-zone overlay → Safe-zone retrofit → Brand Kit editor surfaces → Per-field format drawer → Locale + RTL + Arabic → 7a/b/c polish.

Do not be confused when you see `Phase 1` commits dated AFTER `Phase 4` commits — they are from different eras. Git log `--oneline` makes the progression obvious.

**9 templates ship today:**
- Originals: **Lookbook**, **Editorial**, **Countdown**, **Hero**
- Phase 2 expansion: **Bestsellers (Top 5)**, **Seasonal Campaign**, **Category Carousel**, **Brand Spotlight**, **Gift Guide**

**Still open** (from `PHASE_7_BACKLOG.md`):
- **#5** Aspect × safe-zone matrix QA (eyes-on, deferred).
- **#8** Per-product sub-field formatting (needs stable per-row id for override key).
- **#12** Per-project safe-zone override.
- **#13** Per-project typography override.
- **#17** Custom font uploader (returns if a boutique licenses a second paid family).

**Everything else is closed** — including #1/#2/#3 (visual-polish regressions that were code-audited and found to have no concrete issues), #7 (full text-field wiring in the 4 originals), #10 (drawer default-swatch preview), #16 (RTL pill mirror), #18 (export no-chrome toggle), #19 (drawer keyboard nav).

**Most recent session's work:**
- `a58afa8` — Safe-zone overlay can never bake into MP4 (`data-export-ignore` attribute + `html-to-image` filter).
- `3d3e9bf` — `template_skill.md` updated to reflect the post-Phase-5 template contract (role-bound typography, `useSafeZone`, `useFieldFormat`, `composePrice`, `data-export-ignore` escape hatch).
- Diagnostic commits (`7c930f9`, `25ae067`, `78b1f94`) added and removed while debugging a user-reported "safe zones not applied in export" — turned out to be a perception issue (content IS shifted 60 px at 9:16, but without the dim overlay the shift reads as normal breathing room rather than an obvious margin).

---

## 4. Quick start (verify the environment works before touching anything)

```bash
cd "/Users/dgolani/Documents/Claude Projects/VideoAds/app"
npm install                 # first time on this machine
npm run dev                 # dev server on http://localhost:5173
npx tsc -b --noEmit         # typecheck, must pass silently
npm run build               # production build, must pass
```

If you have access to the Claude Preview MCP:
```ts
preview_start({ name: 'vag-dev' })   // reads .claude/launch.json
```

**Smoke test** (takes ~90 seconds):
1. `/` — Dashboard renders (empty or with project cards).
2. `/templates` — 9 template cards with hover-play previews.
3. Click any "Use template" → lands in `/editor/:id`.
4. Edit a text field → canvas updates live.
5. Click `Aa` next to any text field → right-side Format drawer opens → change family/weight/color → canvas updates live.
6. Top bar → Safe zones toggle → dim strips appear around the canvas content zone.
7. Top bar → locale toggle (AR) → headline re-renders with Noto Kufi Arabic (if text contains Arabic glyphs), canvas flips `dir="rtl"`.
8. Export → modal → Start → wait → download MP4. Verify the MP4 does NOT show the dim safe-zone strips (data-export-ignore filter).

If any of those fail, consult HANDOFF.md §9 Gotchas and §17 "If everything is on fire."

---

## 5. Repo map (top level)

```
VideoAds/
├── ACCOUNT_HANDOFF.md         ← (this file) entry point for a fresh Claude account
├── HANDOFF.md                 ← engineering reference — conventions, recipes, gotchas
├── ROADMAP.md                 ← phased decision log
├── PHASE_7_BACKLOG.md         ← current open-items list (canonical)
├── template_skill.md          ← template-author contract
├── README.md                  ← public-facing intro
├── .claude/launch.json        ← Claude Preview MCP server config (name: "vag-dev")
└── app/                       ← the Vite app (see HANDOFF §4 for full annotation)
    └── src/
        ├── engine/            ← Stage, timeline, math, safeZones, fieldFormatContext, locale
        ├── templates/         ← registry + 9 template folders
        ├── store/             ← Project + EditableState + Brand kit + localStorage
        ├── lib/               ← path, image, export (ffmpeg pipeline), price, useHistory
        ├── app/               ← Shell + routes + components (Editor, BrandPanel, TimelineDock, FormatDrawer, ExportModal)
        └── assets/            ← fonts/, photos/, placeholders.ts, logos
```

Full repo layout with per-file annotations: **HANDOFF.md §4**. Don't re-derive it here; it'd drift.

---

## 6. Git state

- Default branch: **`main`**.
- Working contract: sequential contributors (only one active stream at a time). Non-trivial changes go on a named short-lived branch (`feature/…`, `fix/…`) and merge back to `main`. Tiny obvious fixes can commit directly on `main`.
- Local `main` and `origin/main` should stay in sync after every "push it" instruction. **Never `git push` without that instruction.**
- Commit message style: subject line in imperative or phase-prefixed form (`Phase 7c: …`, `Export: …`, `Fix: …`). Body explains *why* in 2–4 short paragraphs. Every commit made by Claude carries a `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer.
- See HANDOFF.md §18 for the full git workflow.

---

## 7. If the user's first message is open-ended

Common opening patterns and what they mean:

- **"What's the current state / where are we?"** → Summarize from §3 above + `git log --oneline -10` + `PHASE_7_BACKLOG.md`. Do not launch into work.
- **"Add a new template …"** → Read `template_skill.md` end-to-end first. Follow HANDOFF.md §6 recipe. Every new text field needs a `useFieldFormat` wiring or the Format drawer silently no-ops on it.
- **"Fix a bug in template X"** → Open `app/src/templates/<slug>/scene.tsx`. Read the existing Acts. Typecheck must stay clean. Respect the scale helpers (`w`, `h`, `wh`) — never raw pixel literals.
- **"Export is doing X weird"** → HANDOFF.md §8 debug flow. `lib/export.ts` has three ffmpeg gotchas (#2, #3) and a `data-export-ignore` filter (#12) baked in; don't revert them.
- **"Add a feature to the editor"** → Check §5.7 and §5.8 of HANDOFF for the `EditableState` + unified history contract. Route field mutations through `setEditable`, not direct `save`.
- **"Push"** / **"Push the code"** / **"Push to git"** → That is the explicit ask. `git push origin main`. Verify clean result.

If in doubt about scope or architecture, **ask one targeted question** rather than interrogating or inventing. The user prefers brevity.

---

## 8. Where to look for more context

| Question | File |
|---|---|
| How do I add a new template? | `template_skill.md` + HANDOFF.md §6 |
| What's the editor's undo scope? | HANDOFF.md §5.8 |
| How does safe-zone enforcement work? | HANDOFF.md §5.9 + `app/src/engine/safeZones.ts` |
| How do I make a template look right with AND without safe zones? | `SAFE_ZONE_PATTERNS.md` |
| How does the Format drawer plumb overrides? | HANDOFF.md §5.10 + `app/src/engine/fieldFormatContext.ts` + `app/src/app/components/FormatDrawer.tsx` |
| Why doesn't the overlay appear in exported MP4s? | HANDOFF.md §9 Gotcha #12 |
| What's left before shipping? | `PHASE_7_BACKLOG.md` |
| Why is the stack locked? | `ROADMAP.md` "Locked decisions" table |
| What were past gotchas? | HANDOFF.md §9 (13 entries) |
| What's the git workflow? | HANDOFF.md §18 |

---

## 9. Update this file when…

- The user asks you to migrate accounts again → freshen §3 snapshot, §6 git state, §0 "today's state" line.
- A standing user rule changes (especially the git-push policy) → update §1.
- A new top-level companion doc is added at the project root → update §2 reading order and §5 repo map.
- The phase numbering scheme evolves (e.g. a new "Era 3" of phases starts) → update §3.

This file is the bridge between accounts — if it's stale, the next agent starts from a worse place than you did.

---

**Last meaningful update:** 2026-04-22. Working tree clean at `3d3e9bf` on `origin/main`. Phases 0–7c complete. 9 templates shipping. Open items: #5, #8, #12, #13, #17 (see PHASE_7_BACKLOG.md).
