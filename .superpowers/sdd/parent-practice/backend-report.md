# Parent practice backend implementation report

Implemented a separate parent-practice security and data scope for assessments.

## Contract delivered

- Signed `HttpOnly` practice cookie with an eight-hour lifetime, API-scoped path, and cryptographic purpose separation from the learner cookie.
- `/api/assessments/practice/session` unlock/lock and `/api/assessments/practice` workspace/actions.
- Service methods default to learner scope and add explicit practice scope. Paper and attempt reads filter scope; atomic database start/save functions verify the same scope under row locks.
- Published fictional sample exam and review generators. Each run has a unique ID/title. Exam has a 10-minute duration, eight meaningful four-choice questions, and four written questions; review has four written questions.
- Forced practice expiry, report preview, and explicit report delivery after submission.
- Automatic reports, maintenance reconstruction, and reminders exclude practice. Delivery also rejects any practice-labelled job that lacks the explicit manual marker.
- Manual practice output uses `PARENT PRACTICE`, system metadata, and a null Notion score.

## Migration

Apply [db/assessment_practice.sql](../../../db/assessment_practice.sql) after the existing assessment schema. It adds `is_practice`, indexes, scoped atomic start/save RPCs, and the practice-only expiry RPC. It does not modify existing paper or attempt content.

## Verification

- `npm test`: 22 files, 377 tests passed.
- `npx tsc --noEmit`: exit 0.
- `git diff --check`: exit 0.
- Focused red run first demonstrated missing session purpose separation, missing fixture module, report leakage, and reminder leakage. The focused green run passed 43 tests.

The integration smoke script is [scripts/assessment-practice-smoke.mts](../../../scripts/assessment-practice-smoke.mts). It is opt-in and requires a deployed migration/API plus `PARENT_OVERRIDE_PIN`; it was not run locally because no database mutation or deployment was authorized for this worker.

## Remaining operational risk

The SQL migration and new application code must be released together before creating practice rows. Until live integration runs, PostgREST parsing of the JSON-path scope filters and the new RPC signatures are compiler/unit-verified but not production-database-verified. Background expiry still finalizes both scopes; practice delivery is suppressed after result derivation.
