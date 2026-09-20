# Parent practice UI report

## Implemented

- Extracted the assessment room into `app/tests/workspace.tsx`; `app/tests/page.tsx` remains the live route and keeps its default `TestsPage` import contract.
- Added `/tests/practice` with a separate PIN session and `/api/assessments/practice` data/mutation path.
- Added an always-visible practice banner, practice-labelled month/counters, a back-to-live link, and a prominent live Parent practice room link.
- Reused start, autosave, submit, marking, correction, conflict, and expiry behavior through the shared workspace.
- Added repeatable fresh 10-minute exam and 4-prompt review creation, practice-only forced expiry, private report preview, and deliberate labelled report sending.
- Kept live curriculum sync and live endpoint behavior unchanged.

## Focused automated checks

`npm test -- app/tests/practice/page.test.tsx app/tests/page.test.tsx app/tests/assessment-status.test.ts`

- 3 files passed
- 20 tests passed
- Practice tests cover separate endpoint/session isolation, persistent practice labelling/navigation, repeatable create actions, forced expiry, private preview, and deliberate send.
- Existing live tests cover unlock, paper selection, publishing, autosave serialization/recovery, blank-answer warning, revision conflict, authoritative timer expiry, review, and correction.

`npx tsc --noEmit`

- UI/Next route export issue resolved.
- Whole-tree typecheck remained blocked during parallel backend work by missing in-progress `practice` and practice-delivery exports in `app/lib/assessments`; no reported errors point to `app/tests/**`.

## Small realistic stress checklist

This is a failure-mode rehearsal checklist, not a high-volume load certification.

- Reload/autosave: start a practice paper, enter answers, wait for “All answers saved”, reload, confirm the same attempt and answers return, then continue editing.
- Blank/wrong answers: submit one blank written response and one intentionally wrong choice; confirm both render safely in submitted work and the report preview labels the output as practice.
- Conflicting tab: open the same practice attempt in two tabs, save in tab A, edit in tab B, confirm the revision conflict disables stale editing, then reload the saved attempt.
- Timer expiry: start a practice exam, save at least one answer, use “Expire practice timer now”, confirm the server returns submitted saved answers and the report preview becomes available.
- Repeated copies: create the same sample kind twice and confirm both papers remain selectable with distinct attempts; do not delete the first copy.
- Delivery guard: preview a submitted report and verify no success message is shown until “Send labelled practice report” is pressed deliberately.
