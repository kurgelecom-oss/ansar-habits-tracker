# Handoff — Dashboard V2 visual overhaul

## URGENT CODEX → CLAUDE HANDOFF — 2026-08-30 2:26pm AEST

The owner explicitly asked Claude to take over because Codex is near its token
limit. **Read this section before doing anything. Do not discard the dirty
worktree.**

### Last safe pushed state

- Branch: `feat/dashboard-v2-visual`
- Pushed commit: `939c153` — `fix: stretch dashboard panels through viewport`
- Previous provider-free visual commit: `5398345`
- PR #2 remains DRAFT; do not merge.
- Preview: https://deploy-preview-2--ansar-habits-tracker.netlify.app
- `main` remains untouched.

### UI task just completed and pushed

The owner's screenshot showed a large unused strip below short weekend panels.
Cause: `.grid` grew as a flex child but its implicit grid row stayed
content-sized. Fix at `939c153`:

- desktop `.grid`: `grid-template-rows: minmax(0, 1fr)`;
- phone ≤640px: `grid-template-rows:none; flex:none`;
- phone `.panelBody`: `overflow-y:visible` so iPhone uses one document scrollbar,
  not nested panel scrollbars;
- tests raised to 158 and all passed before commit;
- build, TypeScript and scoring sync passed before commit.

This UI commit is pushed but has NOT yet been visually verified on its new
Netlify deploy. First Claude action should be: wait for commit `939c153` to show
`state: ready`, screenshot Weekend at the owner's viewport and iPhone 390px,
then run the DOM overflow query. Expected desktop result: all four panels extend
to the bottom grid line. Expected phone result: normal page scrolling; panel
bodies must not become nested scroll regions.

### Active football task — dirty worktree, TDD in progress

Owner's next top priority: connect the **real current Real Madrid season**.
The approved architecture already exists in
`docs/superpowers/specs/2026-08-29-dashboard-v2-design.md` §9. Use
football-data.org v4, Real Madrid team id `86`, server-only env key
`FOOTBALL_DATA_API_TOKEN`.

Official docs confirmed:

- `GET https://api.football-data.org/v4/teams/86/matches?limit=100`
- auth header: `X-Auth-Token`
- team match list is current-season by default;
- match selection order required by spec: LIVE → finished within 24h → next
  scheduled → unavailable.

#### New uncommitted files that are implemented and green

- `app/lib/football/types.ts`
- `app/lib/football/normalize.ts`
- `app/lib/football/normalize.test.ts` — 4 green
- `app/lib/football/football-data.ts`
- `app/lib/football/football-data.test.ts` — 3 green
- `app/api/football/real-madrid/route.ts`
- `app/api/football/real-madrid/route.test.ts` — 2 green

Provider behavior already implemented:

- phase-aware selection and 24-hour finished window;
- provider crest URL allowlist (`https://crests.football-data.org` only);
- scheduled scores remain `null`;
- missing token and upstream errors return deliberate generic unavailable data;
- token/provider error bodies never reach the response;
- route cache: LIVE 30s, FINISHED 300s, SCHEDULED 3600s, unavailable no-store.

#### Intentional RED boundary right now

`app/components/dashboard/dashboard.test.tsx` was updated to import a new
`./MatchCentre` component and test real LIVE, SCHEDULED and UNAVAILABLE states.
`MatchCentre.tsx` does not exist yet. The next test run must fail on that missing
module; that is the current TDD red step. Do not revert the tests.

Exact next implementation:

1. Run `npm test -- app/components/dashboard/dashboard.test.tsx` and confirm the
   missing `./MatchCentre` import is the failure.
2. Create `app/components/dashboard/MatchCentre.tsx` using `MatchCentreData`.
   Preserve the existing fixture geometry/classes. Rules:
   - LIVE/FINISHED show real score; SCHEDULED shows Sydney kickoff and no score;
   - local `/real-madrid.png` is fallback when team id is 86 and provider crest
     is missing; accurate provider opponent crest otherwise; monogram if absent;
   - no `PREVIEW_FIXTURE`, dummy score, invented opponent or preview badge;
   - unavailable/loading state keeps the same bar geometry and calm truthful copy;
   - Match Readiness remains in Work + Week, never in this bar.
3. Delete `MatchCentrePlaceholder.tsx`, change `app/page.tsx` import/render.
4. Add `football` state plus `loadFootball()` in `app/page.tsx`; fetch
   `/api/football/real-madrid`, initial load and 60s client poll. Polling the
   route is safe because CDN caching is phase-aware.
5. Run targeted red/green tests, then full test/type/build gates.
6. Determine whether `FOOTBALL_DATA_API_TOKEN` exists in Netlify by listing
   **names only**. Do not print values. Local `rg -l` found no token file. If no
   token exists, code and unavailable UI can deploy safely, but real fixture
   data cannot appear until the owner supplies a football-data.org token. Never
   create or guess credentials.
7. Commit provider integration separately from `939c153`, push draft branch,
   verify preview. Update this handoff with final commit/deploy/test evidence.

### Dirty worktree warning

Run `git status --short` before edits. Expected dirty files are the new football
files above plus `app/components/dashboard/dashboard.test.tsx`. `HANDOFF.md`
will be clean once this urgent handoff commit is pushed. Preserve all of them.

### Non-negotiable inherited rules

- Do not merge PR #2 or touch `main`.
- Do not change the 20 protected file hashes listed below.
- New `app/lib/football/**` files are allowed; existing protected `app/lib/*`
  files must remain hash-identical.
- Never shrink a habit row below 44px.
- Never remove `.panelBody` desktop scrolling; a real Monday has 16 habits.
- Verify deployed preview, not only local build.
- Keep provider token server-only; never log it or return it.
- Update this handoff before stopping again.

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
