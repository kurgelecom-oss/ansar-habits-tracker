# Monthly assessments implementation plan

Goal: Ship Friday recall, monthly exams, parent review, curriculum sync and recorded reports on /tests.
Architecture: source snapshots → assignments → immutable attempts → parent review → durable outbox. Next.js routes authenticate sessions, Supabase enforces atomic saves/deadlines, scheduled Netlify job syncs Notion and delivers notifications.
Spec: ../specs/2026-09-20-assessments-design.md

- [x] Data/API: types, private SQL schema, atomic saves, grading, device session, parent PIN checks. Tests first for dates/grading/answer-key redaction and endpoint permissions.
- [x] Workspace UI: monthly navigation, Friday recall forms, timed autosaved exam, results and corrections, parent approval/review; integration tests.
- [x] Curriculum/integrations: dated Notion snapshots, validated 12-question papers, weekly prompts, scheduled sync, retryable Notion/email outbox; source validation tests.
- [x] Deploy: migration, environment configuration, real-source sync, build/tests, preview walkthrough and production smoke tests. Record any integration configuration gap honestly.

Rulings: User requests no questions, so use existing parent PIN and Sydney timezone; 25-minute exams; parent approval protects curriculum validity; subjective marks await parent judgement. First release coverage starts with actual dated rows available in Notion.
