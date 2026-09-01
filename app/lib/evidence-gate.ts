/* ════════════════════════════════════════════════════════════════════════════
   GATE 6 — EVIDENCE. Habits that a SECOND, INDEPENDENT RECORD must confirm
   before they can be ticked at all.

   Today that is exactly one habit: the journal, checked against the Tally form
   the board itself embeds (lib/tally.ts).

   WHY IT EXISTS. Every other gate governs WHEN a tick may happen — the window,
   the pace, the order, the cascade. None of them governs WHETHER anything was
   done, because until now there was nothing to check against: the journal tick
   was the child's own word, and a row that can be tapped having written nothing
   is not a record of a journal, it is a record of a tap.

   IT IS A GATE, NOT AN AUTO-TICK. A matching submission does not tick the row
   and writes nothing. It only makes the row tappable, inside its ordinary
   21:00–21:30 window, after the habits before it. Auto-ticking was considered
   and rejected: it would have to bypass the window and the order to land at all
   (the two real journals on record arrived at 21:42 and 07:39 Sydney, one side
   of the window each), and the tap is the part the child is meant to do.

   WHY THIS IS ITS OWN FILE. Same reasons as lib/parent-verified.ts, which has
   the identical shape — a list in code and a pure predicate over it. A Notion
   checkbox that removes an evidence requirement is a one-tap way to remove the
   evidence requirement, from the same phone the board runs on, so the list
   lives in code and changing it takes a deploy. And a route.ts may only export
   Next's own route fields, so a gate declared inside one cannot be tested
   without going through HTTP.

   PURE. No I/O, no Supabase, no Tally. It is handed an answer and decides what
   that answer is worth — the same asymmetry lib/gating.ts opens with.
   ══════════════════════════════════════════════════════════════════════════ */

import type { JournalEvidence } from "./tally";

/**
 * Notion "Habit ID" values that cannot be ticked without outside evidence.
 *
 * `journal` — a daily learning journal. The deliverable is the writing, and the
 * writing lands on the Tally form, so the form is the record and the tick is
 * only the acknowledgement of it.
 */
export const EVIDENCE_REQUIRED_IDS: readonly string[] = ["journal"];

/** Does ticking this habit require a matching outside record? */
export function requiresEvidence(habitId: string): boolean {
  return EVIDENCE_REQUIRED_IDS.includes(habitId);
}

/**
 * The refusal this gate would return, or null to allow.
 *
 * IT FAILS OPEN ON AN UNKNOWN ANSWER, AND ONLY ON AN UNKNOWN ANSWER.
 *
 * A missing API key or an unreachable Tally leaves this gate silent — surfaced
 * as a warning by /api/tick's diagnostic, never as a refusal. "Tally is down"
 * must not cost a perfect day at 21:15 on a night the journal was written, and
 * that is the same reasoning gateWindow() applies to an unparseable window:
 * degrade to ungated for one habit rather than brick the day.
 *
 * A REACHED Tally reporting no journal is a completely different fact, and that
 * one refuses. lib/tally.ts keeps `error` and `found` in separate fields
 * precisely so these two lines can tell them apart — collapse them into one
 * boolean and the gate either locks the row on every outage or trusts a false
 * that only ever meant "I could not look".
 */
export function evidenceRefusal(
  habitId: string,
  evidence: JournalEvidence,
): { reason: string; message: string } | null {
  if (!requiresEvidence(habitId)) return null;
  if (!evidence.configured) return null;          // no key    → unknown → silent
  if (evidence.error) return null;                // unreachable → unknown → silent
  if (evidence.found) return null;                // a journal exists → allow
  // Named for the button that fixes it. "No journal found" would be accurate
  // and useless; the child needs to know which tap comes next.
  return { reason: "evidence_required", message: "Write your journal in Log Work first" };
}

/**
 * The warnings a silent gate should announce, given today's habits.
 *
 * A gate that quietly stops gating is the thing this repo already guards against
 * elsewhere — windowWarnings() exists for the same reason. Both branches below
 * leave the journal ungated by evidence, which is the safe direction but not one
 * anybody should discover by noticing the row went tappable again.
 */
export function evidenceWarnings(
  habitIds: string[],
  evidence: JournalEvidence,
): string[] {
  if (!habitIds.some(requiresEvidence)) return [];
  if (!evidence.configured) {
    return ["journal: TALLY_API_KEY is not set — the journal evidence gate is OFF"];
  }
  if (evidence.error) {
    return [`journal: Tally unreachable (${evidence.error}) — the evidence gate is OFF this read`];
  }
  return [];
}
