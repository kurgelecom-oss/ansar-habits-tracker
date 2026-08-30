# Handoff — Dashboard V2 visual overhaul

**Branch:** `feat/dashboard-v2-visual` @ `5398345` before the current viewport-fill work
**main:** `0008474` — untouched, no merge has happened
**PR:** kurgelecom-oss/ansar-habits-tracker #2 — **DRAFT, preview only, do not merge**
**Preview:** https://deploy-preview-2--ansar-habits-tracker.netlify.app
**Netlify site:** `ansar-habits-tracker` (`edf30cde-2303-4297-846a-e15682c4f011`)

## Objective

Make the board visually match the owner's reference image
(`~/Downloads/ansar-dashboard-weekday-journal-location.png`) using OUR real
content. The owner reviews by screenshot and is direct about misses. Match the
image; do not invent design.

---

## Working rules that have been earned the hard way

1. **Sample the reference, don't guess.** Colours and geometry in this build were
   read out of the PNG pixel by pixel. Every gradient previously invented for the
   fixture bar was wrong — it is one flat colour. Script pattern that works
   (no PIL on this machine; decode the PNG with `zlib` + manual defilter — see
   the sampling snippet in the session, or use `magick convert ... txt:`).
2. **Diagnose before trimming pixels.** Twice, hours went into shaving padding off
   the wrong element. Query the DOM for what actually overflows:
   ```js
   [...d.querySelectorAll('*')].filter(e => e.scrollHeight - e.clientHeight > 1)
   ```
3. **Never let a guard "pass" vacuously.** A `.clubHeader { height: 40px }` regex
   silently started matching the phone block's `min-height` once the desktop value
   changed. Pin with `(?<!min-|max-)`.
4. **Verify on the deploy preview, not locally.** `npm run build` needs placeholder
   env; the real board needs the preview's server vars.

## Verification commands (all currently green)

```bash
npm test                       # 154 passing
npx tsc --noEmit               # clean
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key" \
NOTION_TOKEN="placeholder" npm run build      # 5/5 static pages

FAMILY_DASHBOARD=/Users/taylankursunlu/Documents/Business/business/family-dashboard \
bash scripts/check-scoring-sync.sh            # IN SYNC
```
`npm run lint` is unusable — ESLint is unconfigured and drops into an interactive
prompt. It is not part of the verification set.

`check-scoring-sync.sh` defaults to a sibling path that does not exist here and
reports FAIL for a MISSING MIRROR, not drift. Always pass `FAMILY_DASHBOARD=`.

## Protected files — must stay hash-identical

Baseline table: `docs/verification/dashboard-v2-baseline.md`. Re-hash with
`shasum -a 256 <file> | cut -c1-16`. All 20 verified unchanged at `ce6a0ab`.

---

## What is DONE

- **Codex pass `5398345`**: both crests were audited and retained; the journal
  and Homeschool session now use the reference's primary/guidance structure;
  Match Readiness moved from the fixture bar into Work + Week. Verified on the
  deploy preview at 1440×820 and at the reference's 1655×932 viewport.
- **Viewport-fill work in progress**: the desktop grid now declares a
  `minmax(0, 1fr)` row so a short weekend roster stretches all four panels to
  the remaining viewport height. At ≤640px the grid and panel bodies return to
  natural document flow so iPhone has one page scrollbar, not nested scrollers.

- **Weekday/Weekend toggle** (`DayViewToggle.tsx`, wired in `page.tsx`). Defaults
  to the server's real day. Picking the other side rebuilds the roster from
  Notion via `habitsOnDay()` and renders every row **LOCKED** — a tick belongs to
  a date and the server refuses one for another day.
- **Colours, sampled off the reference** and tokenised in `globals.css`:
  `--ansar-fixture #02193c` (FLAT — no gradient), `--ansar-panel #0e1420`,
  `--ansar-rowflat #0f1521`, `--ansar-hairline #1b232f`, `--ansar-subtext #b1b8be`.
- **Fixture bar** inset `7.24%` each side (measured: spans 83.7% of the reference
  canvas). Real Madrid + Real Sociedad crests, dummy `2 - 0` preview fixture.
- **Crests**: Real Madrid replaced (was 194×259 — the cause of the blur) with a
  431×600 original, corner flood-filled so the white interior survives.
- **Stadium-with-floodlights background** (`public/stadium-lights.jpg`), generated
  via Higgsfield `gpt_image_2` at 4k, used as page ground + masthead.
- Rows: 46px at the fold / 58px tall, 16px white primary text, grey sub-line,
  27px green ring tick, green points, `-webkit-font-smoothing: antialiased`.
- Score line at the foot of **all four** panels.
- Stretch Wallet decluttered — name + value only.
- Panel grid flexes to fill the fold; panel body scrolls rather than clips.

## Open items, in the owner's priority order

0. **Current active task:** finish and deploy viewport-fill verification on Mac
   and iPhone, then implement the already-approved football-data.org provider
   boundary for Real Madrid team id `86`. Keep UI and provider in separate
   commits. The required server-only variable is `FOOTBALL_DATA_API_TOKEN`.

1. **All remaining team logos.** Owner: "make all team logos goal to be nice size,
   clarity and clean. they need to stand out." Real Madrid + Real Sociedad done.
   Recipe that works:
   ```bash
   magick <src>.png -alpha set -fuzz 12% -fill none \
     -draw "alpha 0,0 floodfill" -draw "alpha %[fx:w-1],0 floodfill" \
     -draw "alpha 0,%[fx:h-1] floodfill" -draw "alpha %[fx:w-1],%[fx:h-1] floodfill" \
     -trim +repage -resize x600 out.png
   ```
   Corner floodfill, NOT `-transparent white` — the latter knocks out the crest's
   white interior too. Source needs ≥400px on the short edge. `logos-world.net`
   served a 3840×2160 Real Madrid; Wikimedia 403s without a browser UA.
   `pixelshot` is installed but renders *pages*, not transparent crests.
2. **Journal copy/structure across all boxes.** Owner could not fully review this
   because the review day was a Sunday — re-check on the Weekday toggle now that
   it exists. Reference sets a white primary line over a smaller grey sub-line.
3. **Match Centre readiness placement.** Still pinned right inside the bar. The
   reference has nothing there. It is absolutely positioned so it does not shift
   the score off centre, but the owner may want it moved into a panel.
4. **`PREVIEW_FIXTURE`** in `MatchCentrePlaceholder.tsx` is DUMMY DATA at the
   owner's request. Delete the constant when a football provider lands; the
   layout does not change.

## Known defects, unfixed

- **Connection status stays "Offline" after network recovery.** The 30s gate poll
  runs and `setOnline(true)` succeeds, but the UI does not flip. App logic, not
  presentation — untouched by this whole visual branch.
- **Anonymous-write probe** still deferred; it risks creating false data.

## The thing that most recently changed the picture

A real Monday is **SIXTEEN habits**, not fifteen — Monday is a soccer day, so
`soccer_training` is on the board. Every "weekday simulation" before the toggle
existed was injecting only `journal` + `homeschool_session` onto the Saturday
set and was therefore one row short. Nine of the sixteen land in Today's
Programme under three section headers, and at the reference's row height that
column runs 129px past the 1440×820 fold with **no** arrangement of padding that
fixes it. Hence `.panelBody { overflow-y: auto }` — a habit on the board that
cannot be seen is a correctness failure; a scrollbar is not.

Do not "fix" that scroll by shrinking rows below 44px. 44px is a hard floor
(iPad touch target) and the guard in `dashboard.test.tsx` reads the declared
value and compares it, so it fails on 40 and passes on 52.

## Verification docs

- `docs/verification/dashboard-v2-baseline.md` — protected hashes, env contract
- `docs/verification/dashboard-v2-preview.md` — the `55bc199` proof
- `docs/verification/dashboard-v2-visual-parity.md` — the parity proof
