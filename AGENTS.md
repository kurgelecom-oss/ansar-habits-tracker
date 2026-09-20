# Ansar learning and assessment work

For any task that builds or changes Ansar's week, phase, curriculum, Friday review or monthly exam, read and follow [docs/WEEKLY_LEARNING_WORKFLOW.md](docs/WEEKLY_LEARNING_WORKFLOW.md) before editing. This is the shared operating procedure for Codex and Claude. Read [docs/ASSESSMENTS.md](docs/ASSESSMENTS.md) for implementation and operations.

- Dated Notion Daily Programme rows are the curriculum input. A week-page narrative, a chat answer or a repository plan alone does not update the assessment room.
- Preserve historical dated work before rolling to a new phase. Record precise taught topics; never infer vocabulary, book content or observed experiment outcomes from an app name or schedule.
- Every week-building task includes an assessment handoff: write/read back the dated programme, trigger curriculum sync, verify its completion and report coverage gaps. Future lesson dates are stored but enter assessment coverage only when their date arrives.
- Keep monthly exams in draft until Nihal confirms taught coverage. Approved exams and started work are immutable; never silently rebuild them.
- Parent rehearsal belongs at `/tests/practice`. Practice must never alter Ansar's learner record or enter automatic reminders/reports. Explicit test deliveries are labelled PARENT PRACTICE.
- Keep credentials, parent PINs, learner responses and private assessment outputs out of Git. Do not send learner responses to the question-generation model.
- Verify browser login with the real form after authentication changes. A signed-cookie API smoke test is insufficient. Never put a real PIN in source or test fixtures.
- Verify the deployed behavior before claiming it works. A successful build or accepted background request is not proof of completion.

These instructions guide agent sessions. Netlify scheduled functions perform unattended synchronization and delivery; markdown memory does not schedule or run an agent.
