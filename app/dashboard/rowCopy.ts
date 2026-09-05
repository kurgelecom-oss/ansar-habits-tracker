/* ════════════════════════════════════════════════════════════════════════════
   Per-row copy: the guidance line under a habit's name, and the caption beside
   it.

   BLOCK-AGNOSTIC, DELIBERATELY. This used to live inside HomeschoolSection,
   which was correct for exactly as long as the journal sat in the Homeschool
   block. It now sits in Afternoon / Evening, between "Teeth brushed" and
   "Reading in bed" — and copy keyed to a SECTION rather than to a HABIT does
   not move with it. The journal's "Recorded" caption simply stopped rendering,
   silently, which is the failure mode this file exists to prevent: whichever
   section draws the row asks here, so moving a habit in Notion moves its words
   with it.

   PRESENTATION ONLY. Nothing here decides a state, a gate or a score.
   ══════════════════════════════════════════════════════════════════════════ */

import type { DashboardHabit } from "./types";
import { journalEvidenceState } from "./model";

export const JOURNAL_ID = "journal";

/**
 * The small line under a habit's name. Absent for rows that need no prompt.
 *
 * THE JOURNAL HAS NO GUIDANCE LINE (tk, 2 Sep 2026). Its row is not a habit the
 * child works through — it is a receipt for a Tally submission, and it now says
 * so in its own name ("Journal Entry via Tally", see `displayNameFor`). A second
 * line explaining the mechanism underneath a name that already states it is the
 * text tk asked to be gone.
 */
const GUIDANCE: Record<string, string> = {
  homeschool_session: "Tap when 4 hours are completed",
  btn_cornell: "A parent enters the PIN once the notes are checked",
};

/**
 * The name a row SHOWS, where that differs from the name Notion stores.
 *
 * Only the journal differs, and it differs because its tick mechanism differs.
 * Every other row on the board is a thing Ansar does and then taps. The journal
 * is a thing he files on a Tally form, and the row ticks itself off the back of
 * that submission (/api/journal-sync) — no tap, ever. Notion's sentence
 * ("Daily learning journal entry written") describes a habit; the row is a
 * receipt. Naming it for its mechanism is what stops it reading as one more
 * unticked box he forgot.
 *
 * The override is keyed to the habit ID, NOT to a block or a section, so it
 * survives Notion moving the journal the way the rest of this file does.
 */
const DISPLAY_NAME: Record<string, string> = {
  [JOURNAL_ID]: "Journal Entry via Tally",
};

export function displayNameFor(habit: DashboardHabit): string {
  return DISPLAY_NAME[habit.id] ?? habit.name;
}

/**
 * The hand-written line wins; otherwise Notion's "Target" (the Saturday Push
 * ladder) is the guidance. Push targets are edited weekly in Notion, so they
 * are deliberately NOT written down here.
 */
export function guidanceFor(habit: DashboardHabit): string | undefined {
  return GUIDANCE[habit.id] ?? (habit.target || undefined);
}

/**
 * The caption beside the row.
 *
 * "Verified" ONLY WHEN A TALLY SUBMISSION SAYS SO. Spec §5 and §10.3 forbid
 * describing a self-certified tick in the language of evidence, so the two
 * captions stay two different words for two different facts: "Recorded" is
 * Ansar's own word for it, "Verified ✓" means the journal was found on the form.
 * `tallyVerified` defaults to false, so a caller that does not pass the evidence
 * gets the modest caption rather than the flattering one.
 *
 * An OVERRIDDEN journal gets no caption: HabitRow's gold badge already says
 * "Parent override" and saying it twice only blurs what it means.
 *
 * "Parent PIN" marks a row that will ask for the PIN when tapped, so the keypad
 * is never a surprise. It is dropped once the row is DONE — at that point it
 * would describe how the tick was made rather than anything still to do, and the
 * daily rows have to stay one line.
 */
export function noteFor(habit: DashboardHabit, tallyVerified = false): string | undefined {
  if (habit.id === JOURNAL_ID) {
    const state = journalEvidenceState(habit, tallyVerified);
    if (state === "VERIFIED") return "Verified ✓";
    if (state === "RECORDED") return "Recorded";
  }
  if (habit.parentVerifyRequired && habit.state !== "DONE") return "Parent PIN";
  return undefined;
}
