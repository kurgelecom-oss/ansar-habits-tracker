# Dashboard V2 Baseline

Captured 29 August 2026 on branch `feat/dashboard-v2-visual`, before any application
code change. This file is the comparison and rollback evidence for Tasks 2–9 of
`docs/superpowers/plans/2026-08-29-dashboard-v2-visual-overhaul.md`.

No secret value is recorded anywhere in this document. Environment variables appear
by name only.

## Production identity

| Item | Value |
| --- | --- |
| Netlify site | `ansar-habits-tracker` |
| Netlify site ID | `edf30cde-2303-4297-846a-e15682c4f011` |
| Production URL | https://ansar-habits-tracker.netlify.app |
| Repository | `kurgelecom-oss/ansar-habits-tracker` |
| Production branch | `main` |
| Published deploy ID | `6a88582943cea100083628d2` |
| Published commit | `00084741ac8d768d125da5091af6b51c7e40f502` (`0008474`) |
| Published deploy title | chore: remove Ansar FC entry from shared top nav |
| Published at | 2026-08-21T13:53:32Z |
| Branch point (local HEAD) | `6d0e29af3e85318a0cae1e8f6ac3b867457ebe47` (`6d0e29a`) |

`main` is two commits ahead of the published deploy. Both are documentation-only
(`b3c7de6` design contract, `6d0e29a` this plan), so production and `main` are
identical in application code.

## Protected routes and response shapes

All six protected GET routes answered HTTP 200 from production. Keys only — no
values, PINs, override reasons, tokens or environment data were saved.

| Route | Response shape |
| --- | --- |
| `/api/habits` | array, length 16 |
| `/api/settings` | `defaultDwellSeconds`, `pointsActive`, `weekendRedemptionOnly` |
| `/api/stretch-items` | array, length 4 |
| `/api/stretch` | `balance`, `dailyRedeemCapMin`, `earnedItemIds`, `earnedWeek`, `lockMessage`, `minPerPoint`, `ok`, `redemptionMessage`, `redemptionOpen`, `remainingToday`, `serverDate`, `spentToday`, `spentWeek`, `timeZone`, `unlocked`, `weekStart`, `weekday`, `weekendBonusActive`, `weekendBonusItemsDone`, `weekendBonusItemsTotal`, `weekendBonusMin`, `weekendRedemptionOnly` |
| `/api/golden-boot` | `awards`, `ok`, `progress`, `serverDate`, `streak`, `target`, `timeZone`, `weekday`, `weeks`, `writeConfigured` |
| `/api/tick` | `defaultDwellSeconds`, `habits`, `habitsError`, `lockoutBackend`, `notionConfigured`, `ok`, `overriddenHabitIds`, `overrideFailures`, `overrideLockedMs`, `overrideLogToday`, `overridePinConfigured`, `rejectionLogError`, `rejectionLogReadError`, `rejectionsToday`, `serverTime`, `serviceRoleConfigured`, `warnings` |

Nested element shapes that Dashboard V2 renders from:

| Object | Keys |
| --- | --- |
| `habits[0]` | `block`, `days`, `dwellSeconds`, `id`, `name`, `order`, `pointType`, `points`, `windowEnd`, `windowStart` |
| `stretchItems[0]` | `category`, `id`, `name`, `points`, `whatCountsAsDone` |
| `tick.habits[0]` | `block`, `dwellSeconds`, `id`, `label`, `message`, `name`, `order`, `pointType`, `reason`, `state`, `window` |
| `tick.serverTime` | `clock`, `date`, `minutesOfDay`, `timeZone`, `utcIso`, `weekday` |

`golden-boot.progress` is a number, not an object.

### Live habit configuration (Notion order)

Recorded because Task 3 fixtures must use the real habit names and ordering.

| Order | Block | ID | Name | Points | Point type | Window | Days |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | pre_homeschool | `bed_dressed` | Bed made + dressed | 0 | block | 06:30–08:30 | Mon–Sun |
| 2 | pre_homeschool | `quran` | Qur'an recitation - 20 min | 0 | block | 06:30–08:30 | Mon–Sun |
| 3 | pre_homeschool | `fajr` | Fajr Namaz done | 0 | block | 06:30–08:30 | Mon–Sun |
| 4 | pre_homeschool | `feet_floor` | Feet on floor by 6:45am - no phone | 0 | block | 06:30–08:30 | Mon–Sun |
| 5 | pre_homeschool | `movement` | Morning movement - 20 min outside (ball work) | 0 | block | 06:30–08:30 | Mon–Sun |
| 6 | pre_homeschool | `breakfast` | Breakfast done - no screens | 0 | block | 06:30–08:30 | Mon–Sun |
| 7 | pre_homeschool | `goals` | Daily goals written + Habits page reviewed | 0 | block | 06:30–08:30 | Mon–Sun |
| 7.5 | homeschool | `journal` | Daily learning journal entry written | 0 | prerequisite | 08:30–13:30 | Mon–Fri |
| 8 | homeschool | `homeschool_session` | Homeschool session completed (4 hrs) | 5 | solo | 08:30–13:30 | Mon–Fri |
| 12 | afternoon_evening | `btn_cornell` | BTN episode + Cornell notes done | 1 | solo | 13:30–21:30 | Mon–Sun |
| 13 | afternoon_evening | `shower` | Shower done | 0 | perfect_day_only | 13:30–21:30 | Mon–Sun |
| 14 | afternoon_evening | `all_namaz` | All Namaz done (Fajr, Duhr, Asr, Maghrib, Isha) | 1 | solo | 13:30–21:30 | Mon–Sun |
| 15 | afternoon_evening | `room_tidy` | Room tidy | 0 | perfect_day_only | 21:00–21:30 | Mon–Sun |
| 16 | afternoon_evening | `teeth` | Teeth brushed | 0 | perfect_day_only | 21:00–21:30 | Mon–Sun |
| 17 | afternoon_evening | `reading` | Reading in bed (15+ min) | 0 | perfect_day_only | 21:00–21:30 | Mon–Sun |
| 18 | conditional | `soccer_training` | Soccer training attended (Mon & Wed only) | 1 | per_session | 15:00–20:00 | Mon, Wed |

`journal` is order 7.5, 0 points, `pointType: prerequisite`, and sorts before
`homeschool_session`. This is the exact case the plan's Task 2 ordering test locks.

### Anonymous Supabase write check — deferred

Spec Phase 0 asks for proof that anonymous Supabase writes remain blocked. Task 1 of
the plan does not list it as a step, and the only honest test is an actual insert
attempt against the production project. It is therefore **deferred to Task 9 Step 4**,
to be run against the Deploy Preview with explicit owner approval. This baseline
records the requirement rather than silently skipping it.

## Protected files

Files the plan forbids this initiative from modifying, with SHA-256 prefixes at the
branch point. Any later task can re-hash these; a changed digest is a release blocker.

| File | SHA-256 (first 16) |
| --- | --- |
| `app/api/golden-boot/route.ts` | `9f21adc760ed28db` |
| `app/api/habits/route.ts` | `56eecba38f72bdfc` |
| `app/api/settings/route.ts` | `491f04ed0d4ab1ca` |
| `app/api/stretch-items/route.ts` | `2af91c16fc6625b8` |
| `app/api/stretch/route.ts` | `1c2f2a1a68903e92` |
| `app/api/tick/route.ts` | `b31e66bbb8882d09` |
| `app/lib/gating.ts` | `79c88a0ee697ada7` |
| `app/lib/scoring.ts` | `a911f7ce6839432f` |
| `app/lib/streak.ts` | `eee15b54e3e86d0b` |
| `app/lib/goldenBoot.ts` | `f680e0d62c21a765` |
| `app/lib/notion.ts` | `6971d2bee345089b` |
| `app/lib/supabase.ts` | `6db0f6db5975f88e` |
| `app/lib/supabase-admin.ts` | `dc449b881e73ed56` |
| `app/lib/time.ts` | `a12669f1c3d176a8` |
| `app/lib/pin-lockout.ts` | `469eb13b0f8603cb` |
| `db/pin_attempts.sql` | `3597be560e329fc6` |
| `db/stretch_completions.sql` | `61d8d876dfc7416f` |
| `db/tick_hardening.sql` | `edf222a2dbde6597` |
| `db/week_results.sql` | `59d2fa8fc17b37b9` |
| `netlify.toml` | `ebe9e59aed5716ac` |

`app/lib/days.ts` and `app/lib/monthReport.ts` also exist and are **not** on the
protected list, but nothing in this plan needs to touch them.

Standing verification command, expected to print nothing:

```bash
git diff -- app/api app/lib db netlify.toml
```

### Environment variable names

Names only; no values were read, printed or stored.

Server-only: `NOTION_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `PARENT_OVERRIDE_PIN`,
`GOLDEN_BOOT_PIN`, `GOLDEN_BOOT_BASE`.

Client-exposed by design: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Task 9's bundle scan must find no match for the five server-only names.

## Build and scoring-sync results

| Check | Result |
| --- | --- |
| `npm install` | pass (no blocking error; `npm audit` advisories pre-exist) |
| `npm run build` with no local env | **fails** — see pre-existing issues |
| `npm run build` with placeholder env | **pass** — compiled, typechecked, 5/5 static pages |
| `scripts/check-scoring-sync.sh` default path | **fails** — see pre-existing issues |
| `scripts/check-scoring-sync.sh` with `FAMILY_DASHBOARD` set | **pass — IN SYNC** |

Build output at the branch point: `/` is 77.4 kB, 180 kB first load; shared JS 103 kB.
Routes emitted: `/`, `/_not-found`, `/export`, and the six `/api/*` routes.
`/export` exists in the app but is outside this plan's scope.

Working commands for every later task:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key" \
NOTION_TOKEN="placeholder" \
npm run build

FAMILY_DASHBOARD=/Users/taylankursunlu/Documents/Business/business/family-dashboard \
bash scripts/check-scoring-sync.sh
```

Mirrored-module digests at the branch point, identical in both repos:
`app/lib/scoring.ts` = `a911f7ce…`, `app/lib/streak.ts` = `eee15b54…`.

## Required visual states

States that must be reproducible in Task 3 fixtures and reviewed in Task 9. No
screenshots are attached to this baseline — the local build cannot render real data
without production secrets, so the visual reference is production itself at deploy
`6a88582943cea100083628d2`.

Day and time contexts:

1. Weekday morning — `pre_homeschool` window live (06:30–08:30).
2. Weekday homeschool — `journal` and `homeschool_session` live (08:30–13:30).
3. Weekday evening — `afternoon_evening` live, late group opening 21:00.
4. Saturday — no `homeschool` block; weekend wallet rules apply.
5. Sunday — same as Saturday; weekend redemption state.

Per-habit states:

6. LIVE — actionable, high contrast.
7. DONE — positive control, subdued row, title still readable.
8. LOCKED — muted but legible, opening time or gate reason visible as text.
9. MISSED — restrained red, plain "Missed" text.
10. OVERRIDE — DONE plus the gold "Parent override" audit marker.

Degraded contexts:

11. Offline — connection indicator shows Offline, learning controls behave safely.
12. Notion unavailable — `tick.habitsError` / `warnings` populated, page still renders.
13. Tally unavailable — Log Work modal fails to embed without breaking the dashboard.

Also to be checked in Task 9 because the plan asserts them directly: journal row
visible on weekdays despite 0 points; `Recorded` used and `Verified` absent; Match
Centre placeholder containing no score, opponent, competition or countdown.

## Rollback procedure

Application code is unchanged at this point, so rollback is currently a no-op. The
procedure below is what applies once later tasks have landed.

**Production is untouched by this plan.** The branch is never merged and never
deployed by Tasks 1–9. If a Deploy Preview is created in Task 9, it is a preview
context only and cannot alter the production deploy.

1. Restore the published production deploy — Netlify UI, Deploys, deploy
   `6a88582943cea100083628d2` (commit `0008474`), "Publish deploy". This is the
   authoritative rollback and needs no Git operation.
2. Discard local work in progress:
   ```bash
   git switch main
   git branch -D feat/dashboard-v2-visual
   ```
3. Undo a single bad commit already made on the branch:
   ```bash
   git revert <sha>
   ```
4. If the branch was pushed, delete the remote branch to remove its Deploy Preview:
   ```bash
   git push origin --delete feat/dashboard-v2-visual
   ```
5. Confirm recovery: production returns HTTP 200 on `/` and all six `/api/*` routes,
   and the protected diff is empty.

No database, Notion, Supabase or Netlify configuration change is made by this plan,
so there is nothing to roll back outside Git and the Netlify deploy pointer.

## Known pre-existing issues

1. **`npm run build` fails without local environment variables.** No `.env.local`
   exists in the checkout; only `.env.local.example` (which lists just the two
   `NEXT_PUBLIC_SUPABASE_*` names). Static generation of `/` throws
   `Missing NOTION_TOKEN` and `supabaseUrl is required`. With placeholder values the
   build passes end to end, so this is an environment gap, not a code defect. Later
   tasks must use the placeholder-env build command above.

2. **`scripts/check-scoring-sync.sh` fails at its default path.** It expects
   `family-dashboard` as a sibling of the repo, but the checkout lives at
   `~/Documents/Business/business/family-dashboard` while the tracker is at
   `~/ansar-habits-tracker`. With `FAMILY_DASHBOARD` set, both mirrored modules are
   byte-identical and the script reports IN SYNC.

3. **`rg` is not usable on this machine.** The name resolves to a shim that prints
   ripgrep's help instead of searching. Task 9 Step 5's bundle scan must use `grep`:
   ```bash
   grep -rE "SUPABASE_SERVICE_ROLE_KEY|PARENT_OVERRIDE_PIN|NOTION_TOKEN|FOOTBALL_DATA" .next/static
   ```

4. **The repo is not `netlify link`ed.** `netlify status` warns about this. All
   Netlify reads in this task used `netlify api` with an explicit `site_id`, which
   works without linking. Linking is not required and was not performed.

5. **`npm audit` reports advisories** in the existing dependency tree. Untouched —
   dependency remediation is outside this plan's scope.

6. **Open scope question for Task 5.** The spec's four-panel grid names Morning
   Habits, Homeschool, Work + Week and Stretch Wallet, but the live configuration has
   four blocks: `pre_homeschool`, `homeschool`, `afternoon_evening` and `conditional`.
   Plan Task 5 says "replace only Morning/Evening presentation", implying one
   `HabitPanel` renders both, yet the grid has no dedicated slot for the seven
   `afternoon_evening` habits or `soccer_training`. This must be resolved before
   Task 5 implementation; it does not block Tasks 2–4.
