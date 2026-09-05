/* ════════════════════════════════════════════════════════════════════════════
   Habits that a parent must sign off with the PIN before they can be ticked.

   WHY THIS IS A CODE CONSTANT AND NOT A NOTION FIELD. Notion owns which habits
   exist, when their windows are and what they are worth — see lib/notion.ts.
   It does not own this, for the same reason it does not own the scoring
   arithmetic: a checkbox in Notion that removes a verification requirement is a
   one-tap way to remove the verification requirement, from the same phone the
   board runs on. The list lives in code so changing it takes a deploy.

   VERIFY IS NOT OVERRIDE. A correct PIN here proves a parent is present; it
   does NOT bypass the window, the dwell, the order or the cascade. The tick is
   an ordinary tick that happened to need a witness, so nothing is written to
   override_log and no gold audit badge appears — a badge that showed up every
   single day would stop meaning "a parent restored this", which is the one
   thing it is for. The bypass path is still the two-second hold and
   `overridePin`, unchanged.

   SHARED, DELIBERATELY. app/api/tick/route.ts enforces it and app/page.tsx
   decides which rows open the PIN dialog. Two copies of this set is how the
   board ends up posting a tick the server will refuse, or worse, tapping
   straight through a habit the server still expects a PIN for.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Notion "Habit ID" values that require the parent PIN.
 *
 * btn_cornell — BTN episode + Cornell notes. The notes are the deliverable and
 * only a parent can see whether they were actually written, so the tick is the
 * parent's word, not the child's.
 */
export const PARENT_VERIFIED_IDS: readonly string[] = [
  "btn_cornell",
  // Saturday Push (5 Sep 2026). A push without a witness is a tap. Saturday is
  // the one day a parent is reliably home, so every Push row needs the PIN.
  "push_engine",
  "push_strength",
  "push_quran",
];

/** Does ticking this habit require the parent PIN? */
export function requiresParentVerification(habitId: string): boolean {
  return PARENT_VERIFIED_IDS.includes(habitId);
}
