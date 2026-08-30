/* ════════════════════════════════════════════════════════════════════════════
   Dashboard V2 display selectors.

   Pure functions, no I/O, no React. Given data the server has already decided,
   they answer only "how is this arranged on screen".

   ONE-WAY DEPENDENCY. This file imports from app/lib/scoring.ts; nothing in
   app/lib or app/api may ever import from here. Gates, scoring and rewards stay
   server-authoritative — a display module must not become an input to them.
   ══════════════════════════════════════════════════════════════════════════ */

import { THRESHOLDS } from "@/app/lib/scoring";
import {
  HABIT_BLOCKS,
  type DashboardHabit,
  type HabitBlockGroups,
  type JournalEvidenceState,
  type MatchReadiness,
  type ReadinessInput,
  type Tier,
  type TierThreshold,
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
 * Sorting is by `order`, which is why the journal works. It is order 7.5 and
 * worth zero points, so any sort keyed on points would bury the one row the
 * homeschool session depends on. The input array is not mutated.
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
 * The weekly tiers.
 *
 * The `min` boundaries are NOT declared here — they are read from
 * lib/scoring.ts, which is the mirrored, byte-checked source of that truth.
 * Only presentation is added: the emoji, the range caption and a colour token.
 * scoring.ts says so itself ("each surface owns its own presentation"), and
 * re-typing 42/34/26/0 here is precisely the drift check-scoring-sync.sh exists
 * to prevent.
 *
 * Colours are CSS custom-property references rather than hex literals so the
 * palette stays in globals.css (spec §11.2). The tokens land in Task 3.
 */
const TIER_PRESENTATION: Record<string, { emoji: string; desc: string; color: string }> = {
  "First Team":      { emoji: "🏆", desc: "42+ pts",   color: "var(--ansar-gold)" },
  "Bench":           { emoji: "✅", desc: "34–41 pts", color: "var(--cyan)" },
  "Reserves":        { emoji: "⚠️", desc: "26–33 pts", color: "var(--ansar-warning)" },
  "Training Ground": { emoji: "❌", desc: "0–25 pts",  color: "var(--ansar-danger)" },
};

export const TIERS: TierThreshold[] = THRESHOLDS.map(threshold => {
  const presentation = TIER_PRESENTATION[threshold.label];
  return {
    min: threshold.min,
    label: presentation ? `${threshold.label} ${presentation.emoji}` : threshold.label,
    desc: presentation?.desc ?? `${threshold.min}+ pts`,
    color: presentation?.color ?? "var(--ansar-muted)",
  };
});

/**
 * The tier a weekly total falls in, plus the whole scale.
 *
 * The scale rides along because Work + Week renders both at once — the current
 * tier and a compact four-stop threshold track — and passing one object keeps
 * the panel from importing the boundaries separately and drifting from them.
 *
 * A total below the lowest boundary still resolves: `find` would return
 * undefined for a negative, and a dashboard that renders "undefined" because a
 * total came back odd is worse than one that renders Training Ground.
 */
export function getTier(points: number): Tier {
  const match = TIERS.find(tier => points >= tier.min) ?? TIERS[TIERS.length - 1];
  return { ...match, thresholds: TIERS };
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
 * not evidence. Only VERIFIED — which nothing in this plan produces — earns
 * full credit. NOT_REQUIRED also credits in full: on a weekend there is no
 * journal to write, and an absent obligation must not read as a failure.
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
 * RECORDED, NEVER VERIFIED. A ticked journal is the child's own word for it,
 * and nothing in this plan reads a Tally record to check. Spec §10.3 and §13
 * are explicit that the two must not be described in the same language, so the
 * VERIFIED branch is deliberately unreachable here — it exists in the type for
 * the future evidence-matching phase to fill in, not for this one to claim.
 *
 * An override is its own answer rather than a kind of completion: a parent
 * restored it, and the board says so.
 */
export function journalEvidenceState(
  journal: DashboardHabit | undefined,
): JournalEvidenceState {
  if (!journal) return "NOT_REQUIRED";
  if (journal.overridden) return "OVERRIDE";
  return journal.state === "DONE" ? "RECORDED" : "MISSING";
}
