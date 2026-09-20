# Weekly planning → Friday recall → monthly assessment

This is the persistent handoff for Claude and Codex. Ansar's weeks may continue to be built one at a time. Each week adds dated curriculum evidence to the current month; there is no need to invent the rest of the month in advance.

## Sources and responsibilities

| Item | Authority | Responsibility |
| --- | --- | --- |
| Weekly lesson content | Notion **2 · Daily Programme**, dated subject rows | Parent and the agent preparing the week |
| Standing subject guidance | Notion **3 · Subject Guides** | Parent and planning agent |
| Weekly page/phase narrative | Human-facing explanation linked from Settings & Links | Planning agent; keep it consistent with programme rows |
| Preserved curriculum and papers | Private assessment database | Daily synchronization |
| Actual understanding | Ansar's original submission, Nihal's review and correction | Ansar and Nihal |
| Agent operating instructions | Repository `AGENTS.md`, `CLAUDE.md`, and this file | All agents touching weekly/monthly work |

Current source IDs live in `app/lib/notion-sources.ts`; read that file instead of creating another independent source map. Assessment room: https://ansar-habits-tracker.netlify.app/tests. Private reports: https://www.notion.so/3e15429afa90813ab352ff939fdae825.

A changed chat, markdown plan, active-week link or Subject Guide alone does not establish dated lesson coverage. The assessment importer reads **Date, Label/Name, Task, Day Topic, Week and Guide** from the actual Daily Programme rows. It reads inactive dated rows too; inactive does not mean cancelled.

## Every time an agent builds or rolls a week

1. **Read before planning.** Read this protocol, the current dated programme, relevant subject guides and the previous week's recorded next steps. Distinguish planned work, submitted work and parent-confirmed understanding. Exclude parent practice. Use the recorded learning gaps to choose revision; do not assume an absent score means failure or use one practice result to infer ability.
2. **Preserve the previous week.** Prefer new dated rows for the new week and retain the old rows. If the board workflow reuses page IDs, complete and verify a curriculum snapshot before changing their dates. Never delete/archive the only copy of unsnapshotted work. Date-keyed snapshots preserve previous dates; changing dates without a successful snapshot can lose coverage. Do not wipe assessment history to fix a phase rollover.
3. **Build the new week one subject/day at a time.** Follow the current board's existing activation, order and phase conventions. Populate the fields below with explicit tasks and learning goals. Link the week narrative and guides as usual, but keep the dated rows complete enough to generate an assessment.
4. **Read back what was written.** Check real calendar dates in Australia/Sydney, subject labels, topic detail, resources and the week identifier. Split combined Skills Mix tasks into clearly identified language, technology and financial-learning sentences so the importer can separate them. The reusable template is `docs/templates/WEEKLY_LEARNING_HANDOFF.md`.
5. **Refresh and verify.** Use Parent tools → Refresh curriculum, or the authenticated maintenance command in `docs/ASSESSMENTS.md`. A 202 response only acknowledges dispatch. Wait for `ansar_assessment_state` → `curriculum.updated_at` to advance, inspect warnings, and read back resulting papers. `scripts/assessment-status.mts YYYY-MM` prints a private, read-only operational summary without student answers. The background job may take a few minutes.
6. **Interpret future dates correctly.** The importer stores future dated lessons immediately, but does not use them as taught assessment coverage before their date. Friday recalls and current-month exam drafts accumulate as lesson dates arrive. A Sunday build of next week's plan is not supposed to create an exam on untaught Monday content immediately. Verify the future snapshots now and their inclusion after the date arrives.
7. **Close with evidence.** Report the week/date range, source rows written, successful sync timestamp, Friday coverage, monthly draft status and any gaps that remain. If a subject has only generic app instructions, say exactly what topic detail is missing. Do not claim all subjects are covered when one was skipped.

### Minimum row content

| Field | Put this in it |
| --- | --- |
| Date | Actual lesson date, not the date the plan was written |
| Label/Name | Recognisable subject name: Maths, English, HASS, Science, Technologies, Languages/Turkish, The Arts, or Health & PE |
| Day Topic | A short topic cue, e.g. “Equivalent fractions” |
| Task | The specific skill/concept, activity, exact resource/unit/passage when relevant, and what Ansar should explain or demonstrate |
| Week | The current week/phase identifier used by the existing programme |
| Guide | Appropriate subject-guide relation where available |

Illustrative detail: “Compare fractions using equivalent denominators; explain why 2/3 and 4/6 represent the same amount; complete three new comparisons.” A weak entry is “Khan Academy 20 minutes.” For Turkish, include the actual words/phrases and their meanings or the specific grammar pattern practised. Do not guess them from a Duolingo unit title. For reading, identify the actual passage/chapter and task; do not invent story events. For practical work, distinguish the planned method from observed results and require a demonstration where appropriate.

This version does not have an automatic taught/not-taught classifier. Once a scheduled date passes, the row is eligible coverage, not proof it happened. If a lesson was skipped or materially changed, Nihal must resolve the coverage discrepancy before approving the exam. Inactive flags do not remove imported coverage; do not use them as a cancellation mechanism. If a dated row was moved or deleted after import, old snapshots remain intentionally: inspect those snapshots and use a deliberate correction instead of assuming the old topic disappeared.

## Friday process

The system generates one recall per subject represented in that week's dated work. Four prompts ask Ansar to recall, explain, apply and identify an uncertainty. He types and submits the responses before the conversation. Nihal then records 0–2 marks using the rubrics, specific feedback and a next step. Ansar's correction is saved alongside the original work.

The conversation now starts from evidence. A vague “we discussed it” is not a recorded review, and a completed form is not automatic mastery. Keep tasks manageable; use one subject at a time. Historical baseline reviews are available to establish a starting point, not newly imposed overdue obligations.

## Monthly process

1. During the month, newly dated lessons update **unpublished** exam drafts. Each eligible subject gets eight multiple-choice and four written questions. Sparse coverage is flagged rather than padded with invented questions.
2. In the last seven calendar days, Nihal previews the questions, answer keys and marking guides. Check what was actually taught, omissions, misleading questions, independent examples and appropriate time. Default is 25 minutes per subject; approval allows 10–90 minutes.
3. Approve only when that paper's intended coverage is settled. **Approval freezes the paper.** Later teaching does not silently enter it. The system warns when new coverage arrives after approval; address it in a later assessment or deliberate supplementary work. Do not approve early and assume it will keep changing.
4. Ansar takes one subject per sitting. The server enforces the deadline and preserves saved answers. Objective marking is immediate; the final overall result waits for Nihal's written-answer marks. Practical subjects require her observed demonstration check.
5. Review gaps and corrections before building the next week/month. Preserve original evidence. Do not apply automatic rewards/punishments from these formative percentages.

## What happens without an agent session

Netlify runs curriculum maintenance daily at 21:00 UTC (07:00 AEST / 08:00 AEDT). It reads Notion, snapshots dated rows, generates Friday recalls, updates eligible monthly drafts, queues reminders and reconciles reports. A separate job runs every ten minutes to finalise expired exams and retry delivery. Refresh curriculum starts the same maintenance early.

Neither Claude nor Codex needs to remain open for these jobs. The agent is needed when you want help designing/updating the next week; the scheduler cannot invent what was taught or make a parent's pedagogical judgement. These markdown instructions persist the workflow but do not schedule an autonomous weekly planning conversation.

## Parent rehearsal

Open `/tests/practice` or Parent tools → Parent practice room and enter the existing parent PIN. Create a sample exam or Friday recall. The same forms, database save rules, grading, review and correction flow are used. Practice has separate access and is excluded from Ansar's learner view, reminders and automatic reports.

Try a wrong answer and a blank answer, wait for “All answers saved”, refresh, submit, mark written answers, record feedback and add a correction. A practice-only expiry control tests deadline behavior without waiting ten minutes. Open the same practice attempt in two tabs and save competing edits to check the stale-version warning. Create a new practice paper for another run; do not reset a learner's original submission.

Inspect the report preview, then deliberately send a labelled practice report if you want to check email/Notion delivery. Such reports say PARENT PRACTICE and use system metadata, never learner scores. This is a functional failure-scenario rehearsal, not a certification of high-volume load capacity or of the quality of every real exam question.

## Prompts to reuse

> Build Ansar's week beginning [date]. Follow the repository's WEEKLY_LEARNING_WORKFLOW.md. Review the previous next steps, update the dated Notion programme and week narrative, preserve the previous week, refresh assessment coverage, verify the completed sync, and report remaining gaps. Keep monthly papers as drafts for Nihal.

> Prepare Ansar's [month] assessment review. Follow WEEKLY_LEARNING_WORKFLOW.md. Audit dated coverage and actual taught-work discrepancies, refresh unapproved drafts, check the 12-question papers and marking guides, and report what Nihal needs to approve. Preserve all approved papers and original attempts.

## Privacy and handoff

Never commit the parent PIN, API secrets, filled student responses or private result exports. This repo stores process and blank templates; Notion and the private database hold individual learning records. Load local environment variables privately for CLI checks. Do not put secret values in shell history or final reports. Weekly generation sends curriculum content to the model, not student answers.
