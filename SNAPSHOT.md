# SNAPSHOT — 2026-10-05 (night)

### Project
Ansar OS — Next.js 15 board for a Year 6 homeschooled child (uses a MacBook): habits, school programme, football pathway, assessments. Netlify + Notion + Supabase.
README: none
Legacy: /Users/taylankursunlu/Projects/ansar-habits-tracker/HANDOFF.md — superseded by this file

### Working tree
THIS FOLDER IS SHARED BY SEVERAL SESSIONS AND PARKED ON A STALE BRANCH. Do not work here: `git fetch`, then `git worktree add -b <branch> ../ansar-<name> origin/main`, symlink node_modules, remove after merge.
Branch: `ui/sections-and-guide` · Commit: `35d605e` · Unpushed: none
`origin/main`: `3240024` (PR #37). This session merged PRs #33–#37. No open PRs. No leftover worktrees from this session.
Dirty files:
- /Users/taylankursunlu/Projects/ansar-habits-tracker/app/leaderboards/leaderboards.module.css — WIP (another session's; do not commit or revert)
- /Users/taylankursunlu/Projects/ansar-habits-tracker/SNAPSHOT.md — generated
Deploy trigger: merge/push to `main` auto-builds Netlify site `ansar-habits-tracker`. Never run `netlify deploy`.

### Verbatim-critical
- Netlify site id `edf30cde-2303-4297-846a-e15682c4f011` · live https://ansar-habits-tracker.netlify.app · Supabase ref `nwxokxjytgplygwbzsla`
- Notion: Daily Programme `collection://e483c22e-5b63-4ea6-888c-ade5935c174b` · Subject Guides `collection://ad64d084-f771-401e-bcd8-1480a6d004f4` · Settings `collection://0415a499-d4ee-49e8-baf6-a3f38ec27235` · Term 4 page https://app.notion.com/p/3f05429afa9081f2b33ef260452d2673
- Secrets by name, in /Users/taylankursunlu/Projects/ansar-habits-tracker/.env.local: `ASSESSMENT_CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. `NOTION_TOKEN` and `PARENT_OVERRIDE_PIN` are EMPTY there; Notion edits go through the Notion MCP.
- Real curriculum sync: POST https://ansar-habits-tracker.netlify.app/.netlify/functions/assessment-maintenance-background with `Authorization: Bearer $ASSESSMENT_CRON_SECRET`. Never run scripts/assessment-maintenance.mts locally. Read-only check: `node --env-file=.env.local --import tsx scripts/assessment-status.mts YYYY-MM`.
- Papers: `review:2026-10-09:week` published · `placement:2026-10:maths` published, opens 2026-10-12, due 2026-10-16 · `exam:2026-10:*` draft.
- Constants: `MASTERY_PASS = 80`, `GATE_START = '2026-10-09'` (app/lib/assessments/gate.ts) · `WEEKEND_UNLOCK_MIN_SCHOOL_DAYS = 4` (app/lib/weekend.ts) · localStorage `ansar-notices-done-v1`. Lock off switch: Netlify env `ASSESSMENT_GATE=off`.

### Running state
None started by this session. Listening, not mine, left alone:
node on :3000 (shared folder dev server) | unknown | PID 94628 | find: `lsof -nP -iTCP:3000 -sTCP:LISTEN` | kill: `kill 94628`
node on :8788 | unknown | PID 65361 | find: `lsof -nP -iTCP:8788 -sTCP:LISTEN` | kill: `kill 65361`
node on 127.0.0.1:7265 | unknown | PID 2190 | find: `lsof -nP -iTCP:7265 -sTCP:LISTEN` | kill: `kill 2190`
No launchd jobs for this repo.

### Blocked on tk
- Target Map (PR #41): every tile opens its own OS at /os/[zone] (scholar, languages, quran, digital, outdoors, combat, chess), built like /pathway; content in app/os/data/<zone>.ts, saved to zone_log. NOT connected to the programme (tk, 5 Oct): the PS5 zone rule, /api/targets and target_proofs are gone.
- Before Fri 9 Oct: unlock the MacBook browser once at https://ansar-habits-tracker.netlify.app/tests with the parent PIN (cookie lasts 30 days).
- Nihal approves October exam drafts in the last week of October at the same URL.
- After Mon 12 Oct: read Tests → Level and say whether the maths rows get harder or easier.
- Unanswered: should parent notices need the PIN to tick off; should the unlock notice reappear whenever the browser is locked.

### Decisions
- 2026-10-05 — points removed; Saturday PS5 = `homeschool_session` on 4 of 5 weekdays then the Push (tk confirmed). scoring.ts untouched; family-dashboard still shows points.
- 2026-10-05 — whole Term 4 preloaded: 231 Active dated rows, 5 Oct–18 Dec; `pickWeek()` in app/lib/homeschool.ts shows the current week. Never untick weeks or build on Fridays; edit dated rows in place.
- 2026-10-05 — history = three 3-week units (Rome W2–4, Islamic world W5–7, Europe W8–10), week three is mastery week, Friday row labelled `Teach-back`. Nothing Australian.
- 2026-10-05 — exam under 80% re-locks the board on school days until parent review + his correction; `placement:` papers exempt.
- 2026-10-05 — Level readout in Tests (app/lib/assessments/level.ts); level check questions were hand-written and inserted directly into `ansar_assessment_papers`.
- 2026-10-05 — message board: app/lib/notices.ts (dated tables are Term 4 2026 only); notices clear on facts from GET /api/assessments/gate or a per-day tick, no PIN.
- 2026-10-05 — screens: no separate ladder; the board's gates are the system. Languages = Turkish then Arabic; never raise French/German.
- 2026-10-05 — December exam window ends 2026-12-18 (hard-coded year in app/lib/assessments/generation.ts monthWindow).
- 2026-10-04 — do NOT raise the Supabase quota/billing warning again.

### Pick up here
Zone OSes are live and standalone. Do not wire them into habits, school blocks or PS5 until tk says so. Content was written by agents from well-documented sources; tk/Nihal should skim the Qur'an and Languages OSes first.
