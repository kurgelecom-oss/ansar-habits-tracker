# School Inventory — what the old OS actually holds

Phase 0 artifact. School side only; football is out of scope here.
Evidence gathered 4 Oct 2026 from Notion, Supabase, the repo and the live site.

## The rule

**Nothing earns KEEP by existing.** Every row carries evidence that someone used it.
No evidence = DROP candidate until tk says otherwise.

Earned the hard way: the exam engine passed 401 tests, synced nightly for weeks and
generated 6 drafts. It was never switched on. Working and used are different things.

## Verdicts

| Verdict | Means |
|---|---|
| KEEP | Carries over as-is |
| REBUILD | Idea is right, implementation changes |
| DROP | Never used or superseded |
| PARK → Pn | Right idea, wrong phase. Must name the phase. |
| **COMPLIANCE** | Keep regardless of usage — exists to prove the child is educated |

---

## Layer 1 — The year  ·  SIGNED OFF (tk, 4 Oct 2026): all five REBUILD

| Element | Where it lives | Evidence of use | Call |
|---|---|---|---|
| Year level (Year 6) | **nowhere** | 0 references in code, Notion or docs | REBUILD — needs to exist |
| Australian Curriculum v9 mapping | **nowhere** | 0 references anywhere | REBUILD |
| Achievement standard per subject | **nowhere** | 0 references anywhere | REBUILD |
| Year goals ("by Christmas") | restructure doc prose only | never in the system | REBUILD |
| Term / phase arc | `Week` text field, e.g. "Phase 1 — Week 8" | present on 78/80 rows | REBUILD — string, not structure |

Layer 1 is almost entirely absent. Football has all of it (`pathway/data/week.ts`).

## Layer 2 — The arc (term)  ·  SIGNED OFF (tk, 4 Oct 2026): all REBUILD

| Element | Where it lives | Evidence of use | Call |
|---|---|---|---|
| Phase name + week number | `Week` text field | 78/80 rows filled, 4 distinct values | REBUILD as structured field |
| "You are here" marker | nowhere | never built for school | REBUILD |
| Monthly focus per learning area | nowhere | never built for school | REBUILD |
| Off-season / break handling | `Week` = "Off-Season Break", 15 rows | **dateless BY DESIGN** — break page states the rows are loaded with no date so they never reach recalls or exams | KEEP as intended (corrected 4 Oct; first read called this a bug) |

## Layer 3 — The week  ·  SIGNED OFF (tk, 4 Oct 2026)

| Element | Where it lives | Evidence of use | Call |
|---|---|---|---|
| Mon–Fri shape | `Day` select | 78/80 filled | KEEP |
| Week identifier | `Week` text | 78/80 filled | REBUILD (see layer 2) |
| Week narrative page | Settings → Active Week Page URL | live, but **still pointing at the expired break page** | KEEP, fix staleness |
| Week view for Ansar | **nowhere** | he cannot see his own week | REBUILD |
| Weekly load/hours cap | nowhere (football has 12 hr cap) | never built for school | REBUILD |

## Layer 4 — The session (the day)  ·  SIGNED OFF (tk, 4 Oct 2026)

| Element | Where it lives | Evidence of use | Call |
|---|---|---|---|
| `Label` (Block 3 — HASS) | Daily Programme | 80/80 filled | KEEP |
| `Task` (the actual work) | Daily Programme | 80/80 filled | KEEP |
| `Day Topic` (day theme) | Daily Programme | 80/80 filled | KEEP |
| `Duration` | Daily Programme | 78/80 filled | KEEP |
| `Order` (position in day) | Daily Programme | 78/80 filled | KEEP |
| `Guide` relation | Daily Programme → Subject Guides | 78/80 filled | KEEP |
| `Note` (optional aside) | Daily Programme | 15/80 — optional by design | KEEP |
| `Active` checkbox | Daily Programme | used; importer reads inactive rows too | REBUILD — misleading name |
| Subject Guides table | Notion `3 · Subject Guides` | 12 guides, all active, all written | KEEP |
| Per-block tick | **nowhere** | 5 hrs of school = 1 checkbox | REBUILD — keystone |
| Task text on the row | hidden in a pop-up | — | REBUILD |

### Known content weakness
Task quality varies. "Khan Academy — next lesson" and "Duolingo Turkish 10 min" are
unassessable: Languages was the only subject that produced no exam draft in September.
The workflow doc already forbids this; the rows do it anyway.

## Layer 5 — The record  ·  SIGNED OFF (tk, 4 Oct 2026)

| Element | Where it lives | Evidence of use | Call |
|---|---|---|---|
| `habit_completions` | Supabase | **840 rows**, last 28 Sept | KEEP |
| `override_log` | Supabase | **338 rows**, last 28 Sept | KEEP — but see below |
| `stretch_completions` | Supabase | 226 rows, last 24 Sept | KEEP |
| `week_results` | Supabase | 4 rows, weeks 13 Jul–3 Aug, all written in the same second on 8 Aug = one backfill, never ran again. Tier concept still in daily use on paper. `confirmed_by_taylan` false on all 4. | REBUILD |
| `tick_rejections` | Supabase | 11 rows, last 14 Sept | KEEP (anti-cheat evidence) |
| Per-subject completion record | **nowhere** | does not exist | REBUILD — keystone |
| Points → screen time conversion | Settings note: "B001 still undefined" | points count, nothing redeems them | PARK → name a phase |
| Monthly evidence export `/export` | repo route, print-to-PDF | few times a year by design | **COMPLIANCE** |

### Flag: 338 overrides against 840 completions
Roughly 2 in 5 recorded ticks are parent overrides, not Ansar ticking. Either the
gating is too strict or the record is not describing what actually happened. Worth a
decision before the record is rebuilt on top of it.

## Layer 6 — The ritual (Friday recall)  ·  SIGNED OFF (tk, 4 Oct 2026): PARK

| Element | Where it lives | Evidence of use | Call |
|---|---|---|---|
| Friday recall generation | assessment engine | 21 published Sept | PARK → next phase (tk, 4 Oct) |
| Recall screen | `/tests` tab | never actioned | PARK |
| Nihal's marking + correction flow | `/tests` | 7 attempts, 0 reviewed | PARK |

## Layer 7 — The proof (monthly exam)  ·  SIGNED OFF (tk, 4 Oct 2026): PARK

| Element | Where it lives | Evidence of use | Call |
|---|---|---|---|
| Exam draft generation | assessment engine | 6 Sept drafts, **0 approved, 0 sat** | PARK → next phase (tk, 4 Oct) |
| Approval freeze | engine | never exercised | PARK |
| Parent practice room `/tests/practice` | repo route | built, never actioned | PARK |
| `sourceStatus` line | `service.ts:84` | **actively misleading** — per-run counters read as totals | REBUILD (small) |

tk, 4 Oct 2026: tests and exams were scaffolding for a possibility, never switched on.
Park the lot and rebuild properly in a later phase with gates that force the sessions.

---

## Cross-cutting

| Element | Evidence | Call |
|---|---|---|
| School has no home route | `/` + 4 shared routes vs football's 14 | REBUILD → `/school` |
| Board reads Notion live on every load | 2.1 s first paint locally | REBUILD → read stored copy |
| Dateless rows invisible to importer | 15 break rows | REBUILD → validation |
| App cannot build without live secrets | `/` prerender dies on missing Supabase URL | fix in Phase 0 |
| No Node version pinned, deps on `^` | no `.nvmrc`, no `engines` | fix in Phase 0 |

## Open questions for tk

1. ~~`week_results`~~ — RESOLVED 4 Oct: REBUILD. Backfilled once on 8 Aug, never ran again.
2. Points exist but redeem nothing (B001). Which phase owns it?
3. 338 overrides vs 840 completions — is the gating too strict, or is the record wrong?

## Audit status

All 7 layers signed off by tk, 4 Oct 2026. This file is the contract phases 1-6 build against.


---

## OVERDUE — term changeover (found 4 Oct 2026)

The break page carries its own switch-back checklist, due **before Mon 5 Oct**. Not done.

| # | Setting | Currently (break) | Term value |
|---|---|---|---|
| 1 | `homeschool_session` tile | "Off-season block done", 08:30–20:00 | "Homeschool session completed (4 hrs)", 08:30–13:30 |
| 2 | `btn_cornell` tile | "Screens inside the cap + off on time" | "BTN episode + Cornell notes done" |
| 3 | `feet_floor` tile | "by 7:00am" | "by 6:45am" |
| 4 | Daily Programme | 15 break cards active; no Term 4 week exists | Term 4 Week 1 rows loaded, break rows off |
| 5 | Settings → Active Week Page | the break page | Term 4 Week 1 page |
| 6 | Subject Guides | "Off-Season Break" guide active | untick Active |

Known cost already documented on the break page: break ticks were stored under the
school tile ids, so `/export` counts those 10 holiday days as school sessions. That is
the document registration reads.
