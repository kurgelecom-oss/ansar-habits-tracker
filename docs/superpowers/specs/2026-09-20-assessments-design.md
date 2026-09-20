# Monthly learning record

Build an authenticated monthly assessment workspace replacing the non-persistent Tests mockup. User explicitly authorized execution and deployment without questions.

Friday: one structured recall per programme subject per week, four prompts (recall, explain with example, connect/apply, uncertainty). Ansar submits immutable work. Nihal grades each of the four responses 0–2 (accuracy, explanation, application, honest reflection), for eight points total, writes feedback and next action. Corrections are separate records. Completion never implies mastery.

Monthly: 12 source-grounded questions per taught subject; eight multiple-choice auto-marked, four written scored by parent 0–2. 25-minute default, parent may grant extra time before start. Papers require parent approval and confirmation of coverage. No browser answer keys before submission. Server owns deadline, answers autosave, expired attempts submit saved work. No automated privilege sanctions. Practical subjects require a recorded demonstration alongside knowledge questions.

Notion Daily Programme is curriculum source. Daily scheduled sync snapshots dated rows before phases change and creates weekly recall assignments and monthly draft papers. Preserve submitted versions. Generation uses a server-only AI key and strictly validates output/source IDs; never fabricate papers if source unavailable. Missing coverage is explicit. Current month initially starts from available programme rows, not assumed earlier weeks.

Supabase private tables store snapshots, assignments, attempts and durable integration jobs. Notion receives result records, email sends due reminders and results via configured transport. Retryable jobs, no repeated reminders. Parent PIN initializes a private device session; parent review/publish requires PIN separately. No personal answers in unauthenticated APIs.

All dates Australia/Sydney; one current student (Ansar); default month calendar month. Review deadlines Friday, monthly exam opens last seven days. Older overdue work remains actionable. Test timing, grading, idempotency, auth, answer-key secrecy and integration failures.
