# SNAPSHOT — 2026-10-04

### Project
Ansar OS — Next.js 15 board for a Year 6 homeschooled child: habits, points, school programme, football pathway. Deployed on Netlify, data in Notion + Supabase.
README: none
Legacy: /Users/taylankursunlu/Projects/ansar-habits-tracker/HANDOFF.md — superseded by this file

### Working tree
Branch: `main`
Commit: `55442df`
Dirty files: none
Unpushed commits: none
Deploy trigger: push/merge to `main` auto-builds and publishes Netlify site `ansar-habits-tracker`. Do NOT run `netlify deploy` — a local publish and the git build silently revert each other.
Branch deploys are OFF. Only `main` and PR deploy-previews build.

### Verbatim-critical
- Netlify site id: `edf30cde-2303-4297-846a-e15682c4f011`
- Supabase project ref: `nwxokxjytgplygwbzsla` (named `kurgel-dashboard`)
- Notion Daily Programme data source: `collection://e483c22e-5b63-4ea6-888c-ade5935c174b`
- Notion Subject Guides data source: `collection://ad64d084-f771-401e-bcd8-1480a6d004f4`
- Notion Habits data source: `collection://470a7eba-f14b-42c5-92fb-79a006720240`
- Notion Settings data source: `collection://0415a499-d4ee-49e8-baf6-a3f38ec27235`
- Active Week page (Term 4 Wk 1): https://app.notion.com/p/3ef5429afa9081c78e8addfe86920acf
- Node pinned `22.23.3` in /Users/taylankursunlu/Projects/ansar-habits-tracker/.nvmrc AND netlify.toml. Local machine runs Node 26 — the gap is real.
- All env values: /Users/taylankursunlu/Projects/ansar-habits-tracker/.env.local (chmod 600, gitignored). Names only: `NOTION_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `PARENT_OVERRIDE_PIN`, `ASSESSMENT_CRON_SECRET`, `ASSESSMENT_SESSION_SECRET`, `ANTHROPIC_API_KEY`.
- WARNING: `netlify env:list --plain` returns EMPTY values for vars set per-deploy-context whose "Local development (Netlify CLI)" box is blank. `NOTION_TOKEN` and `PARENT_OVERRIDE_PIN` both do this. Check value length, not key presence.
- Curriculum sync is NOT `/api/assessments/maintenance` (that is expire+deliver only). It is `POST /.netlify/functions/assessment-maintenance-background` with `Authorization: Bearer $ASSESSMENT_CRON_SECRET`. Returns 202 = dispatched, not done.

### Running state
Next dev server (this session) | `npm run dev` in repo root | PID 94728 | find: `lsof -nP -iTCP:3000 -sTCP:LISTEN` | kill: `kill 94728`
Unrelated `node serve.js` on 8788 | not started by this session | PID 65361 | find: `lsof -nP -iTCP:8788 -sTCP:LISTEN` | kill: `kill 65361`
No launchd jobs for this repo. Scheduled work runs on Netlify: `netlify/functions/assessment-daily.ts` at `0 21 * * *` UTC.

### Blocked on tk
One Chrome tab left open on the Supabase SQL editor (close call timed out twice) — close it manually.

### Decisions
- 2026-10-04 — tests/exams are PARKED, not built on. They were scaffolding, never switched on (6 drafts, 0 approved, 0 sat); affects any work touching /tests, Friday recalls or monthly exams.
- 2026-10-04 — do NOT raise the Supabase quota/billing warning again. tk's instruction.
- 2026-10-04 — `package-lock.json` is now TRACKED (was gitignored as a "build artifact"); affects every build — Netlify previously re-resolved `^` ranges on each deploy.
- 2026-10-04 — every dependency pinned to an exact version; affects `npm install`, which also needed 3 malformed rollup lockfile entries removed before it would run at all.
- 2026-10-04 — the board gets its OWN snapshot table, not `ansar_assessment_lessons`. That store drops Label/Order/Duration, splits one Notion row into several lessons and shortens tasks; affects Phase 2 onward and contradicts docs/overhaul/restructure.txt.
- 2026-10-04 — per-block school record keyed on Notion page id, never the display slug (slug = label+position, moves on reorder); affects school_block_completions and school_programme_snapshots.
- 2026-10-04 — new write routes must have gate parity with /api/tick. An ungated POST holding the service role bypasses db/tick_hardening.sql; affects every future API route that writes.
- 2026-10-04 — Phase 3 did NOT shrink the dashboard homeschool card, despite the proposal putting it there. Doing it with the /school build would make the "nothing disappears" gate unverifiable; deferred to Phase 4.
- 2026-10-04 — scoring.ts, gating.ts, evidence-gate.ts, streak.ts and api/tick are untouched through Phases 1–3 and must stay so during design phases.

### Pick up here
Phase 4 ("Make them peers") in /Users/taylankursunlu/Projects/ansar-habits-tracker/app/page.tsx — rebuild the dashboard as two equal pillars (School, Football) with habits as scaffolding beneath, shrink the homeschool card to a summary linking to `/school`, and fix the phone overflow visible in docs/overhaul/screenshots/baseline/phone-390--home.png (nav clips at "Targ…", hero line bleeds past both edges). Read docs/overhaul/SCHOOL-INVENTORY.md first — all 7 layers are signed off and it is the contract. Done when `npm test` is green (currently 405), `next build` with every secret unset still generates 22/22 pages, `/api/habits` still returns 19 habits, and phone/tablet/desktop screenshots re-captured at 390/834/1440 show no horizontal scroll.
