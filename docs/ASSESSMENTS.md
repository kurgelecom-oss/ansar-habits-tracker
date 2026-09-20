# Assessment room

The /tests workspace is a calendar-month learning record for Ansar. Parent PIN setup authorises a device for 30 days. Approval and marking always require the existing parent PIN again.

## Friday

One review per subject in the dated Notion Daily Programme, opening Friday. Four written prompts cover recall, explanation, application and honest uncertainty. Responses autosave, submissions preserve original work, and Nihal scores each response 0–2 with feedback and a specific next step. Admitting a gap is not a failure. Historical reviews created after their coverage date are baseline work, never overdue obligations.

## Monthly exams

Twelve questions per subject with enough recorded detail: eight multiple-choice and four written. The last seven calendar days form the exam window. Take one subject per sitting. Nihal previews the full answer key, confirms taught coverage and chooses 10–90 minutes (default 25) before publishing. Approval is tied to the precise previewed questions; a changed curriculum requires a new preview. Questions remain hidden from Ansar until the timer starts.

The database owns the deadline. Refreshing, closing the tab or changing the device clock cannot restart it. Late arrivals cannot overwrite the last saved answers. If the browser is closed, the 10-minute maintenance schedule finalises expired work. Disconnected edits cannot count after the deadline; the page warns about unsaved work. Written marks remain pending until parent review. Objective correctness and overall understanding are separate. Corrections preserve the original answers and marks; they do not erase mistakes or automatically claim mastery. No automatic privilege consequences.

## Curriculum

Daily sync reads every dated row (including historical/inactive rows) from Daily Programme, resolves Subject Guides, and keeps durable date-keyed snapshots. It builds Friday reviews and current-month exam drafts. Published/started papers are immutable. New weeks update unpublished drafts automatically. Question generation sends curriculum task data only, never student answers. It uses structured JSON, source-ID validation, and a parent approval gate; structural validation is not a guarantee of pedagogical accuracy.

Generic app instructions cannot establish what was taught. Add actual topic details to the corresponding dated Task column. For Turkish, record the practised vocabulary/phrases or grammar rather than only “Duolingo 10 min.” Exam generation reports insufficient coverage and retries at the next sync. Practical subjects also require a parent-confirmed demonstration. Existing screenshot-derived technology topic rows explicitly distinguish observed work from mastery.

## Notifications and records

Daily at 21:00 UTC (07:00 AEST / 08:00 AEDT): snapshot curriculum, draft papers, queue due reminders, reconcile reports and deliver. Every 10 minutes: finalise abandoned exams and deliver queued reports. Friday recall reminders, monthly exam-window reminders, Monday overdue reminders, parent exam-approval reminders, and Monday/Friday marking reminders use daily deduplication keys.

Submission, parent review and correction each create a private Notion report plus a short email linking to the authenticated workspace. Emails exclude detailed responses. The configured recipient initially matches the established homeschool-report inbox. Failed jobs remain in the private outbox with sanitized errors and retry leases. An ambiguous Gmail send is reconciled via its stable subject marker; it is never blindly resent. Provider success means accepted by Gmail, not proof of inbox delivery or reading.

Notion destination: https://www.notion.so/3e15429afa90813ab352ff939fdae825

Tables: ansar_assessment_lessons, ansar_assessment_papers, ansar_assessment_attempts, ansar_assessment_outbox, ansar_assessment_state, ansar_assessment_pin_failures. All are inaccessible to public/anonymous and ordinary authenticated database roles. The server service role is the only reader/writer. See db/assessments.sql for schema and atomic transitions. Parent PIN attempts are serialized in Postgres to prevent parallel guessing.

## Verification and operations

- npm test; npx tsc --noEmit; npm run build.
- node --env-file=.env.local --import tsx scripts/assessment-integrity.mts checks private storage/timing with automatically cleaned verification fixtures.
- Local API check: run dev server with a temporary process-only PARENT_OVERRIDE_PIN, then ASSESSMENT_TEST_PIN matching it with scripts/assessment-api-check.mts. Test jobs are removed; never run a delivery worker concurrently with this fixture test.
- node --env-file=.env.local --import tsx scripts/assessment-maintenance.mts performs the same real sync as the scheduled job, including delivery of queued real notifications.
- Parent tools → Refresh curriculum dispatches background maintenance. The 202 response means accepted, not finished. Refresh the room after a few minutes.
- Monitor ansar_assessment_state curriculum.updated_at and payload.warnings. Pending outbox count is visible under Parent tools. Inspect last_error privately for retries that need repair.

Assumptions: Sydney calendar and existing family parent PIN; one student; 25-minute default; 75% is a formative summary threshold, never a formal qualification or punitive gate. The system measures submitted evidence, not identity, independent authorship or learning needs. A parent PIN identifies a trusted family reviewer rather than proving who was at the keyboard.

## Release verification — 20 September 2026

Production: https://ansar-habits-tracker.netlify.app/tests

362 tests pass across 20 files; TypeScript and production build pass. Live database checks cover concurrent starts, stale revisions, immutable papers, public-role denial and late-answer rejection. The API workflow verifies parent preview/approval, objective grading, pending written work, recorded parent marks, corrections and six durable report events; its temporary fixtures were cleaned. Mobile and desktop walkthroughs passed.

The initial source import contains 65 dated lesson snapshots, 21 historical Friday baseline reviews and six September exam drafts (72 questions). No student attempts were fabricated. Languages remains an explicit coverage gap until actual vocabulary/grammar is recorded. Nihal still approves each exam and reviews subjective answers. The configured notification recipient is the existing homeschool-report inbox, kurgelecom@gmail.com; a separate direct address for Nihal was not available.

Netlify confirms daily curriculum scheduling at `0 21 * * *` and delivery/expiry processing at `*/10 * * * *`. Anonymous assessment API requests return 401; authenticated requests return the populated workspace with unstarted exam questions withheld.

Final verified deployment: `6aaf910c6013221d96830aab`. The deployed background worker completed curriculum sync at 2026-09-20 07:53:46 UTC. It created a labelled system setup record in Notion and sent the genuine setup email through Gmail; both outbox events are confirmed sent with no remaining errors. The first provider check exposed Composio’s required entity identifier; the configured account uses `default`, now included in every request. No learner assessment records were used for this delivery check.
