# Dashboard V2 Visual-Parity Verification

Verified 29 August 2026 against the Netlify Deploy Preview. No production
deployment, no merge, and no production data mutation of any kind.

Companion to `dashboard-v2-preview.md`, which verified `55bc199`. This document
covers the visual-parity pass on top of it.

## Preview identity

| Item | Value |
| --- | --- |
| Preview URL | https://deploy-preview-2--ansar-habits-tracker.netlify.app |
| Verified commit | `3cc73aa` |
| Branch | `feat/dashboard-v2-visual` |
| Pull request | kurgelecom-oss/ansar-habits-tracker #2 — **draft, not for merge** |
| Netlify site | `ansar-habits-tracker` (`edf30cde-2303-4297-846a-e15682c4f011`) |
| Production (untouched) | commit `0008474` |
| Server state during review | Saturday 22:0x Australia/Sydney |

## The height trade, measured

The parity pass grows the masthead and pays for it by hiding the shared 40px
cross-surface TopNav on this route only.

| Region (at 1440 × 820) | `55bc199` | `3cc73aa` |
| --- | --- | --- |
| `.clubNav` | 40 | 40 |
| `.clubHeader` | 36 | 62 |
| `.matchCentre` | 56 | 70 (cap 104) |
| `.shell` gaps × 2 | 12 | 12 |
| Shared TopNav reservation | 40 | **0** |
| **Total above the panels** | **184** | **184** |

The board costs the page exactly what it did before. The masthead and the
restored Match Centre are funded entirely by the nav that this route no longer
draws — not by a habit row.

## Measured at 1440 × 820, weekday roster

`journal` and `homeschool_session` are Mon–Fri, and the review ran on a
Saturday. The server filters the roster by its own clock, so the weekday board
was produced by injecting those two habits — with their real Notion values —
into the gate response inside the probe frame. The rows are then rendered by
the real components, real CSS and real emphasis rules. **This is a simulated
roster on a real render, not an observed weekday.**

| Check | Result |
| --- | --- |
| Short-desktop media query active | yes |
| Habit rows | 15 |
| Minimum row height | 44px |
| Rows below the fold | 0 |
| `document.scrollHeight` | 820 — equal to the viewport |
| Vertical overflow | 0px |
| Horizontal overflow | 0px |
| Elements clipped by `overflow:hidden` | **0** |
| Panel grid bottom | 697 of 820 — **123px clear** |
| `data-emphasis` applied | `journal`, `homeschool_session` |

## Breakpoints

| Viewport | Columns | Scroll | Clipping | Horizontal overflow |
| --- | --- | --- | --- | --- |
| 390 × 844 | 1 | vertical (expected) | 0 | **0** |
| 1024 × 900 | 2 | vertical (expected) | 0 | 0 |
| 1440 × 820 | 4 | none | 0 | 0 |
| 1920 × 1080 | 4 | none | 0 | 0 |

The 390px horizontal overflow recorded against `55bc199` is **resolved**. All
seven overflowing elements were the shared nav, which this route no longer
renders.

## The shared nav is genuinely scoped

Proven on the live preview rather than argued from the selector. With the
dashboard `main` present, `.topnav` computes to `display: none`. Renaming its
`aria-label` returns the bar to `display: flex`; restoring the label hides it
again. The rule cannot reach any other surface.

`/export`, the only other route, hides `.topnav` itself with `!important` and
never uses `.ab-root`. The other five surfaces in the shared-nav family are
separate deploys with their own `globals.css` and are untouched by this repo.

## Parity against the reference image

The reference is authority for hierarchy, atmosphere and depth only. Its
fictional content — the 2–0 result, Real Sociedad, 1,250 pts, 85 gems, the
12-day streak, Quests/Teams/Leaderboards — is **not** reproduced.

| Element | State |
| --- | --- |
| One ANSAR FC bar, shield + wordmark | matches |
| Stadium masthead, serif `Ansar · ANSAR FC` | matches |
| Substantial Match Centre | matches, and truthful |
| Four premium panels | matches |
| Journal prominence | gold edge, first homeschool row |
| Homeschool prominence | cyan edge, +5 pts chip, 44px+ |
| Fictional score / currency | correctly absent |

The Match Centre states "Fixture data not connected yet" and "Real data will
appear here after the football provider is approved." Match Readiness is
separately labelled and reads 23% with "Journal not written yet". No invented
opponent, result, competition or countdown appears anywhere on the board.

### Two gaps found here and fixed in `3cc73aa`

1. **Masthead scrim too light.** At a 0.52 centre stop the stadium seating read
   as the subject and the status row sat on bright blue plastic. Raised to 0.84.
2. **Match Centre still crushed.** It was cut to a 56px strip with its third
   line hidden to save height the board no longer needs — 123px sit clear below
   the panels. Cap raised to 104px and the explanatory line restored.

## Build health at `3cc73aa`

| Check | Result |
| --- | --- |
| `npm test` | **156 passed** |
| `npx tsc --noEmit` | clean |
| `npm run build` (placeholder env) | 5/5 static pages |
| Protected files | all 20 hash-identical to the baseline |
| Scoring/streak mirrors | in sync with family-dashboard |
| Secrets in `.next/static` | none |

`scripts/check-scoring-sync.sh` defaults to a sibling path that does not exist
on this machine and reports `FAIL` for a missing mirror rather than drift. The
real mirror is at `~/Documents/Business/business/family-dashboard`; pass it via
`FAMILY_DASHBOARD=`. Worth fixing the default so genuine drift is never mistaken
for the usual path error.

`npm run lint` is not usable: ESLint is unconfigured and the script drops into
an interactive setup prompt. It is not part of the baseline's verification set.

## Not signed off

- **A real weekday has still never been observed.** The 15-row board above is a
  simulated roster on a real render. Only a Mon–Fri session proves it.
- **Connection status stays "Offline" after network recovery.** Carried over
  from `55bc199` and untouched by this pass — it is app logic, not presentation.
  The gate poll runs and `setOnline(true)` succeeds, but the UI does not flip.
- **Anonymous-write probe** still deferred; it risks creating false data.
- Production merge still requires owner review against the reference image.
