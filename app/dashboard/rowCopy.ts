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

/** The small line under a habit's name. Absent for rows that need no prompt. */
const GUIDANCE: Record<string, string> = {
  journal: "Write it in Log Work, then tap here",
  homeschool_session: "Tap when 4 hours are completed",
  btn_cornell: "A parent enters the PIN once the notes are checked",
};

export function guidanceFor(habit: DashboardHabit): string | undefined {
  return GUIDANCE[habit.id];
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
