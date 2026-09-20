# Parent practice and durable curriculum workflow

Goal: parents can rehearse the full live assessment flow without contaminating Ansar's record; Claude/Codex receive durable weekly/monthly operating instructions.

## Global constraints
- Practice uses the existing assessment forms, grading, database deadlines and revision protection.
- Practice papers have is_practice=true; they and their attempts never appear in learner views, reminders, learner counts or automatic reports.
- Practice requires a separate PIN-authorized, signed HttpOnly session. A learner session alone cannot read or mutate practice data; practice APIs cannot mutate learner data.
- Use deterministic, explicitly fictional/sample review and 12-question exam papers, no model calls or assertions of learner progress.
- Practice is available immediately. Existing real exams and submissions remain immutable.
- Parents can create a fresh practice paper, force only its timer to expire, inspect the actual report output and deliberately send a clearly labelled practice report. No automatic practice email/Notion delivery.
- Reports sent from practice use system metadata and PARENT PRACTICE labels; never student scores in Notion's Score property.
- No PINs, credentials or learner responses in repository docs.
- Existing daily curriculum sync remains the scheduler; repository instructions guide the human-requested weekly planning session.

## Contract
- UI /tests/practice uses shared TestsPage content and /api/assessments/practice (GET month, POST actions); session /api/assessments/practice/session POST pin, DELETE.
- GET returns normal Workspace restricted to practice.
- POST normal start/save/submit/preview/publish/review/correction actions, plus create {kind:'exam'|'review'} returns {paper}, expire {attemptId} returns {attempt}, report-preview {attemptId} returns {report:{subject,text,report}}, send-report {attemptId} returns {message}. All require practice session; explicit parent actions still check PIN when existing shared form supplies it.
- create returns published sample paper, exam 10 minutes (existing database minimum), 8 choices + 4 written; review 4 written. Unique fresh IDs, open/due today. No reset/deletion of originals.
- Report preview/send only after submission; unique practice event keys keep retries idempotent.

## Tasks and ownership
1. Backend: auth/session, API routes, practice service/fixtures, service scope protections, types, delivery suppression/manual output, SQL additive migration, focused tests and integration smoke script. Owner backend agent.
2. UI: shared workspace accepts API/session path via practice flag; /tests/practice wrapper; parent tools entry; practice banner/create/expire/output/send controls; tests. Owner UI agent. Do not start real learner papers during verification.
3. Durable workflow: AGENTS.md, CLAUDE.md, weekly/monthly protocol, reusable template and operating docs. Owner root.
4. Independent review of combined backend/UI diff; migrate, verify full parent rehearsal and isolation, deploy, browser login/full flow, merge. Owner root plus reviewer.

## Verification
Unit/integration tests of API isolation, no automatic practice jobs, explicit labelled reports, deadline expiry and original learner rows unchanged. Real browser parent unlock → create sample → start → autosave → submit → score → parent marks → correction → output preview. Live opt-in practice mail/Notion verification if needed. Full tests, TypeScript and production build. Report limits honestly: this verifies realistic failure scenarios, not high-volume load certification.
