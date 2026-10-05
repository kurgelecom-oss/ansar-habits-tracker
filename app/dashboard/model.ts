/* ════════════════════════════════════════════════════════════════════════════
   Dashboard V2 display selectors.

   Pure functions, no I/O, no React. Given data the server has already decided,
   they answer only "how is this arranged on screen".

   ONE-WAY DEPENDENCY. Nothing in app/lib or app/api may ever import from here. Gates, scoring and rewards stay
   server-authoritative — a display module must not become an input to them.
   ══════════════════════════════════════════════════════════════════════════ */

import {
  HABIT_BLOCKS,
  type DashboardHabit,
  type HabitBlockGroups,
  type JournalEvidenceState,
  type MatchReadiness,
  type ReadinessInput,
} from "./types";

/**
 * Split habits into their configured blocks, each sorted into Notion order.
 *
 * Every known block key is always present, even when empty, so a caller cannot
 * silently drop a subsection by reading an undefined key. An unrecognised block
 * gets a group of its own rather than being discarded: contract amendment
 * 8027d53 requires that no configured habit disappears, and a block added in
 * Notion tomorrow must surface as a visible extra rather than vanish.
 *
 * Sorting is by `order`, Notion's own. The input array is not mutated.
 */
export function groupHabitsByBlock(habits: DashboardHabit[]): HabitBlockGroups {
  const groups = {} as HabitBlockGroups;
  for (const block of HABIT_BLOCKS) groups[block] = [];

  for (const habit of habits) {
    (groups[habit.block] ??= []).push(habit);
  }
  for (const block of Object.keys(groups)) {
    groups[block].sort((a, b) => a.order - b.order);
  }
  return groups;
}

/**
 * Summarise today's learning state as a single labelled percentage.
 *
 * DISPLAY ONLY, and deliberately not a score. Spec §5 forbids one kind of truth
 * masquerading as another: this number must never be shown in the score
 * position between two real teams, must never award a completion, and must
 * never alter a real football result. The `label` field is part of the contract
 * so the value cannot be rendered anonymously, and there is no home/away field
 * for a caller to mistake for a scoreline.
 *
 * Weights: morning 40, homeschool 30, journal 20, work 10.
 *
 * The journal earns half credit at RECORDED because a self-certified tick is
 * not evidence. Only VERIFIED earns full credit — a tick with a matching Tally
 * journal submission standing behind it. That state used to be unreachable and
 * is now produced by journalEvidenceState() below; the 20-vs-10 split is the
 * whole reward for writing the thing rather than only ticking it.
 * NOT_REQUIRED also credits in full: on a weekend there is no journal to write,
 * and an absent obligation must not read as a failure.
 *
 * The result is clamped to 0..100. The weights sum to exactly 100, so anything
 * outside that range means the inputs disagreed with themselves — more habits
 * done than configured, or a negative count. Clamping HERE rather than at each
 * consumer is what keeps them honest together: the Match Centre feeds this one
 * number to the visible figure, the fill width and aria-valuenow at once, and
 * an unbounded value would both overflow the track and announce a value
 * outside its own aria-valuemax.
 */
export function deriveMatchReadiness(input: ReadinessInput): MatchReadiness {
  // A zero total means no morning habits are configured today, not that none
  // were done. Crediting in full avoids both a divide-by-zero and a permanent
  // 40-point penalty for a day the schedule left empty.
  const morning = input.morningTotal > 0 ? input.morningDone / input.morningTotal : 1;
  const journal = input.journalState === "VERIFIED" ? 1
    : input.journalState === "RECORDED" || input.journalState === "OVERRIDE" ? 0.5
    : input.journalState === "NOT_REQUIRED" ? 1 : 0;
  const raw = Math.round(morning * 40 + Number(input.homeschoolDone) * 30
    + journal * 20 + Math.min(input.workSubmissionCount, 1) * 10);
  return {
    label: "Match Readiness",
    percent: Math.max(0, Math.min(100, raw)),
    journalState: input.journalState,
  };
}

/**
 * How much evidence stands behind today's journal.
 *
 * RECORDED AND VERIFIED ARE STILL DIFFERENT WORDS, and this is the function
 * that finally earns the second one. Spec §10.3 and §13 forbid describing a
 * self-certified tick in the language of evidence, so VERIFIED requires a
 * SECOND, INDEPENDENT record: a matching "Daily Journal" submission on the
 * Tally form, read server-side by lib/tally.ts and reported by /api/tick as
 * `journalEvidence.found`. A tick alone is still only RECORDED.
 *
 * `tallyVerified` DEFAULTS TO FALSE, which is what keeps that honest. A caller
 * that has not been given the evidence cannot accidentally claim it, and every
 * call site that forgets to thread it through degrades to the old, more modest
 * answer rather than to the flattering one.
 *
 * An override outranks both: a parent restored it, and the board says so rather
 * than dressing a restoration up as either kind of completion.
 */
export function journalEvidenceState(
  journal: DashboardHabit | undefined,
  tallyVerified = false,
): JournalEvidenceState {
  if (!journal) return "NOT_REQUIRED";
  if (journal.overridden) return "OVERRIDE";
  if (journal.state !== "DONE") return "MISSING";
  return tallyVerified ? "VERIFIED" : "RECORDED";
}
