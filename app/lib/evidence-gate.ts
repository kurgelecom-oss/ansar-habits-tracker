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

   THE JOURNAL IS ALSO AUTO-TICKED NOW (tk, 2 Sep 2026), by /api/journal-sync.
   Filing the form IS the completion — there is no second tap to make. This gate
   did not become redundant when that shipped: it still governs the MANUAL path,
   so a tap that arrives before the sync (or while Tally is unreachable) is
   judged on exactly the same evidence. Two doors, one rule about what counts.

   SEE AUTO_TICKED_IDS BELOW for what the auto-tick deliberately bypasses and
   why it has to.

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
 * Habits that the outside record does not merely UNLOCK but COMPLETES.
 *
 * `journal` — filing the Tally journal is the whole deliverable. tk, 2 Sep 2026:
 * "just complete the tally form journal to earn the tick". So /api/journal-sync
 * writes the completion itself and the row needs no tap at all.
 *
 * WHAT THIS BYPASSES, AND WHY IT MUST. The journal's Notion window is
 * 21:00–21:30 and its Order is 16.5, behind `teeth`. Neither survives contact
 * with when journals are actually written: the two on record landed at 21:42
 * and 07:39 Sydney — one either side of the window, neither inside it. An
 * auto-tick that honoured the window would therefore almost never fire, and an
 * auto-tick that fires almost never is worse than none, because it teaches that
 * the form does not work.
 *
 * So the sync writes past gates 1–4. It is not a hole: the evidence IS the
 * gate. Nothing lands without a completed, non-empty, correctly-dated "Daily
 * Journal" from Ansar on form ODKlVa, and that is a far higher bar than the tap
 * it replaces — which required nothing at all.
 *
 * THE AUDIT TRAIL IS THE TALLY SUBMISSION. No override_log row is written,
 * deliberately: the gold badge has to keep meaning "a parent restored this".
 * `journalEvidence.submittedAt` in /api/tick is the record of where the tick
 * came from, and it is the child's own writing, timestamped by Tally.
 */
export const AUTO_TICKED_IDS: readonly string[] = ["journal"];

/** Does filing the outside record complete this habit outright? */
export function isAutoTicked(habitId: string): boolean {
  return AUTO_TICKED_IDS.includes(habitId);
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
