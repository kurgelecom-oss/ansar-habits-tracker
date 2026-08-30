# Dashboard V2 Deploy Preview Verification

Verified 29 August 2026 against the Netlify Deploy Preview. No production
deployment, no merge, and no production data mutation of any kind.

## Preview identity

| Item | Value |
| --- | --- |
| Preview URL | https://deploy-preview-2--ansar-habits-tracker.netlify.app |
| Verified commit | `55bc199` |
| Branch | `feat/dashboard-v2-visual` |
| Pull request | kurgelecom-oss/ansar-habits-tracker #2 — **draft, not for merge** |
| Netlify site | `ansar-habits-tracker` (`edf30cde-2303-4297-846a-e15682c4f011`) |
| Production deploy (untouched) | `6a88582943cea100083628d2`, commit `0008474` |
| Server state during review | Saturday 21:2x Australia/Sydney |

A pull request was required to obtain a preview at all: the site's
`allowed_branches` is `["main"]`, so pushing the branch alone builds nothing.
The PR is a draft and exists only to trigger the preview.

**Correction to the baseline.** The baseline recorded a belief that Deploy
Previews lack `NOTION_TOKEN`. That is now false: all five server-only variables
are scoped to the `deploy-preview` context, and the preview answered with
`notionConfigured: true`, `serviceRoleConfigured: true`,
`overridePinConfigured: true` and 13 real habits. Every check below ran against
real Notion and Supabase data, not fixtures.

## Automated checks

| Check | Result |
| --- | --- |
| `npm test` | **149 passed**, 0 failed |
| `npx tsc --noEmit` | clean |
| `npm run build` | succeeds; `/` 78.5 kB, 181 kB first load |
| `scripts/check-scoring-sync.sh` | IN SYNC |
| Route health (7 GETs on the preview) | all **HTTP 200** |

Routes checked: `/`, `/api/tick`, `/api/habits`, `/api/settings`, `/api/stretch`,
`/api/stretch-items`, `/api/golden-boot`.

## Protected-contract diff

`git diff -- app/api app/lib db netlify.toml` is **empty** at `55bc199`.

All twenty protected files hash identically to the values recorded in
`dashboard-v2-baseline.md`: the nine `app/lib` modules, the six API routes, the
four `db/*.sql` files and `netlify.toml`. The two mirrored modules
(`scoring.ts`, `streak.ts`) remain byte-identical to their family-dashboard
copies.

## 1440 × 820 visual review

The acceptance viewport, measured against an exact 820px fold.

Because the server day was Saturday, the live board is the **weekend** case
(13 habits, no Homeschool). The **weekday nine-row programme** — the tightest
case — was measured by cloning subsection rows in the DOM locally. No network
call and no write was involved; it is a layout measurement only.

| Measure | Weekend (live) | Weekday nine-row (simulated) |
| --- | --- | --- |
| Vertical scroll | 0 | 0 |
| Horizontal scroll | 0 | 0 |
| Habit rows rendered | 13 | 16 |
| Rows in Today's Programme | 7 | **9** |
| Rows clipped | 0 | **0** |
| Rows hidden | 0 | **0** |
| Habit row `min-height` | 44px | **44px** |
| Match Centre content clipped | 0px | 0px |
| Headroom below the source strip | — | **20px** |

Region heights at this viewport: club nav 40, club header 36, Match Centre 56,
panel grid 576, Notion strip 23. Morning Habits is the tallest panel, so the
programme is no longer the binding constraint.

Contract requirements, each checked: no routine scrolling ✅ · no clipping ✅ ·
journal visible on a weekday (present in the simulated Homeschool subsection,
first row) ✅ · readable disabled states ✅ · truthful Match Centre placeholder
("Fixture data not connected yet", no score, opponent, competition or kickoff)
✅ · balanced four-panel grid (`364 364 306 350`) ✅.

**Homeschool prominence** could not be assessed on live data — the server day
had no Homeschool block. It remains outstanding and is the one item that needs
a weekday look.

## Responsive review

Measured in same-origin iframes sized exactly to each target, so media queries
evaluate against the real viewport. The physical display caps the browser window
at 1440 × 876, which is why the iframe harness was used rather than window
resizing.

| Viewport | Columns | V-scroll | H-scroll | Rows hidden | Notes |
| --- | --- | --- | --- | --- | --- |
| 1440 × 820 | 4 | 0 | 0 | 0 | acceptance viewport; compact rules active |
| 1920 × 1080 | 4 | 0 | 0 | 0 | roomier rules correctly re-engage above 900px tall |
| 1024 × 900 | 2 | 331 | 0 | 0 | two-up; page scrolls by design below 1440 |
| 390 × 844 | 1 | 1334 | 0 | 0 | stacked; Match Centre column; header wraps to 3 lines |

At 390px the device clock is hidden while the **server clock and connection
state remain visible**, as designed. Nothing overflows the page horizontally.
Elements extending past the right edge (7) are all inside the two
horizontally-scrollable navigation bars — the shared `.topnav` and the club nav
— and the active "Dashboard" item is visible without scrolling.

**Observation, not a defect:** spec §12.3 asks for navigation to become "a
compact menu" on mobile. It currently scrolls horizontally instead, matching the
existing shared TopNav pattern. No item is unreachable. Worth a decision in a
later phase.

## Tally verification

Opened and closed only. **Nothing was submitted.**

| Check | Result |
| --- | --- |
| `aria-haspopup` / `aria-expanded` before | `dialog` / `false` |
| Modal opens on Log Work | yes, `role="dialog"` `aria-modal="true"` |
| Embedded form | `ODKlVa` |
| Embed origin | `https://tally.so` |
| `aria-expanded` while open | `true` |
| Escape closes | yes, dialog removed, `aria-expanded` back to `false` |
| Non-GET requests during the whole walkthrough | **0** |

## Parent override verification

The most important behaviour on the board, verified end to end on real data.
Cancelled without a PIN; **no override was confirmed**.

| Check | Result |
| --- | --- |
| Target row | `Qur'an recitation - 20 min` (MISSED) |
| `aria-disabled` | `true` |
| HTML `disabled` | **`false`** — the row stays pointer-reachable |
| Hold ring after 700ms | present |
| Dialog after 2s | opens, `aria-modal="true"` |
| Dialog copy | the server's own reason: "Missed — the window closed at 8:30am" |
| PIN field | `type="password"`, empty |
| Escape cancels | yes |
| Row after cancel | still refused, still enabled |
| Writes | **0** |

Four habits carried real parent overrides on the day of review
(`bed_dressed`, `fajr`, `feet_floor`, `breakfast`) and each rendered the gold
"Parent override" audit marker, visually distinct from an earned completion.

## Wallet verification

Every value compared against `/api/stretch` and `/api/stretch-items`. Nothing
was earned and nothing was redeemed.

| Check | Server | Rendered |
| --- | --- | --- |
| `unlocked` | `false` | locked state shown |
| `lockMessage` | "Locked — Qur'an recitation first" | rendered **once** |
| `minPerPoint` | 10 | every item priced at `points × 10` |
| `dailyRedeemCapMin` | 75 | "75 min/day cap" |
| `redemptionOpen` | `false` | Convert button disabled |
| Items | 4 | all 4 rendered by name |

The conversion rate comes from the loaded response, not the local constant —
the amendment made before Task 9. Balance is withheld while locked ("—"),
rather than guessed.

## Accessibility review

- Every habit state carries text as well as colour: "Missed", the gate's own
  "Do X first" lock reason, "Parent override".
- Refused rows are `aria-disabled`, never HTML-disabled, so the parent hold
  remains reachable — and assistive tech is still told they are not actionable.
- Both progress bars are range-safe: `WeeklyTierProgress` omits `aria-valuenow`
  when the week is unknown and clamps it otherwise; Match Readiness is clamped
  to 0–100 at source.
- The server clock carries "Server clock — every gate uses this"; the device
  clock carries "This device's clock — display only, no gate reads it". The two
  were confirmed distinct and correctly labelled on the live preview.
- Connection state is a word ("Live" / "Offline"), not colour alone.

## Security review

| Check | Result |
| --- | --- |
| Server-only env var names in deployed JS (9 chunks, 780 kB) | **no matches** |
| Server-only env var names in local `.next/static` | **no matches** |
| `service_role` / service-role JWT in bundle | **no matches** |
| PIN-shaped literal in bundle | none |
| Non-GET requests during the entire review | **0** |

Names scanned: `SUPABASE_SERVICE_ROLE_KEY`, `PARENT_OVERRIDE_PIN`,
`NOTION_TOKEN`, `GOLDEN_BOOT_PIN`, `GOLDEN_BOOT_BASE`, `FOOTBALL_DATA`.

**Anonymous Supabase write-denial probe: still deferred.** The plan permits it
only if it can be guaranteed non-creating. It cannot. The proposed
duplicate-key insert is non-creating only if a unique constraint covers that key
*and* RLS denies before the constraint is evaluated; if RLS had regressed and no
such constraint existed, the probe would itself create the row it was meant to
prove impossible. Deferred, deliberately, rather than run a test that can cause
the outcome it is checking for.

## Defects and remediation commits

Three defects were found on the first preview (`877b187`) and fixed; one further
defect was introduced by the first fix and also fixed. All were found by
measurement, not by eye.

| # | Defect | Root cause | Fix |
| --- | --- | --- | --- |
| 1 | **BLOCKER** — nine-row weekday programme ran 83px past the fold and clipped a habit row. `.ab-root` is `overflow-y:hidden` at this width, so the row was *unreachable*, not merely below the fold. | The four-panel grid had no height budget for a nine-row column. | `be58414`, `7fec1cb` — height recovered from chrome only |
| 2 | Club navigation collapsed 44px → 18.8px. | `.clubNav` was the only child of the flex-column shell without `flex-shrink: 0`. | `be58414` |
| 3 | Stretch Wallet printed the lock reason twice. | `/api/stretch` sets `redemptionMessage` equal to `lockMessage` while locked; the panel rendered both. | `be58414` |
| 4 | Compacted Match Centre clipped its own readiness note (`scrollHeight` 61 vs `clientHeight` 54, `overflow:hidden`). | Introduced by the compaction in `7fec1cb`. | `55bc199` — readiness laid out two-up |

Height for defect 1 was taken **only** from non-learning chrome, per direction:
the placeholder Match Centre (128px → 56px; it displays no fixture at all), the
Notion source strip, panel header and body padding, and subsection dividers.
No habit row was shrunk — `.habitRow` keeps its 44px target, guarded by a test
that fails if any rule anywhere sets it lower. No habit was hidden or removed.
No panel scrolls internally.

Regression tests added: nav shrink guard, duplicate lock-copy suppression,
44px row target, Match Centre honesty at the compact breakpoint, and the
readiness grid layout. Test count rose 139 → 149.

## Production recommendation

**READY FOR OWNER REVIEW**

The blocker is fixed and re-verified on the preview; automated checks, protected
contracts, security scans and the safe behaviour walkthrough all pass. Three
things are deliberately not signed off here and are the owner's to judge:

1. **Homeschool prominence on a weekday** was never seen on live data — the
   review day was a Saturday. This was the open question when the 112px hero
   treatment was removed, and it is still open.
2. **The anonymous-write denial probe is unrun**, for the reason given above.
   Production readiness should not be asserted without it.
3. **The nine-row programme was measured by DOM simulation**, not observed on a
   real weekday. The measurement is sound — real rendered rows at real widths —
   but a weekday look before release would close the gap.

Rollback remains the baseline procedure: republish deploy
`6a88582943cea100083628d2` (commit `0008474`). Production has not been touched.
