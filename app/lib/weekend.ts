/* ════════════════════════════════════════════════════════════════════════════
   THE WEEKEND RULES — pure, one copy, both sides of the wire.

   Decided with tk on 5 Sep 2026 (docs/superpowers/specs/2026-09-05-saturday-push-design.md):

     1. THE WEEK DECIDES IF.   Mon–Fri points reach Bench (34/55) or better →
                                Saturday PS5 is unlocked. Below that, no PS5 that
                                weekend, and nothing done on Saturday buys it back.
     2. SATURDAY DECIDES WHEN. PS5 starts only once every Saturday Push row is
                                parent-verified. The Push happens either way.
     3. SUNDAY DOES NOT EXIST. Nothing to view, nothing to tick.

   No I/O, no React, no clock. The threshold is read from scoring.ts's THRESHOLDS
   rather than re-typed, so a tier change there moves this rule with it.
   ══════════════════════════════════════════════════════════════════════════ */

import { THRESHOLDS } from "./scoring";

/** The tier label a week must reach for Saturday PS5. */
export const WEEKEND_UNLOCK_TIER = "Bench";

/** Points needed for that tier — 34 today, read from scoring.ts not typed here. */
export const WEEKEND_UNLOCK_MIN_POINTS =
  THRESHOLDS.find(t => t.label === WEEKEND_UNLOCK_TIER)?.min ?? 34;

/** The one day the whole system is switched off. */
export const REST_DAY = "Sunday";

export function isRestDay(weekday: string): boolean {
  return weekday === REST_DAY;
}

/** Rule 1: did the week earn the weekend? */
export function weekendUnlocked(weekPoints: number): boolean {
  return weekPoints >= WEEKEND_UNLOCK_MIN_POINTS;
}

export type SaturdayPs5 = {
  /** Rule 1 verdict. */
  weekUnlocked: boolean;
  /** Rule 2 progress. */
  pushDone: number;
  pushTotal: number;
  pushComplete: boolean;
  /** Both rules met: the controller may come out. */
  ready: boolean;
  /** One sentence for the card. */
  message: string;
};

/**
 * The Saturday PS5 verdict, from facts the server has already decided:
 * `weekPoints` is the Mon–Fri total, `pushDone`/`pushTotal` count DONE rows in
 * the saturday_push block as /api/tick reports them.
 *
 * A Push block with NO rows is never "complete" — a Notion outage, or a Saturday
 * before the rows exist, must not read as a finished Push.
 */
export function saturdayPs5(weekPoints: number, pushDone: number, pushTotal: number): SaturdayPs5 {
  const weekUnlocked = weekendUnlocked(weekPoints);
  const pushComplete = pushTotal > 0 && pushDone >= pushTotal;
  const ready = weekUnlocked && pushComplete;
  const message = !weekUnlocked
    ? `No PS5 this weekend — the week finished under ${WEEKEND_UNLOCK_MIN_POINTS}. Push still on.`
    : pushTotal === 0
      ? "Saturday Push not loaded — nothing to unlock against"
      : pushComplete
        ? "PS5 unlocked — Push done, week earned it"
        : `PS5 waits — Push ${pushDone}/${pushTotal} verified`;
  return { weekUnlocked, pushDone, pushTotal, pushComplete, ready, message };
}

/**
 * Saturdays in a row with the full Push verified, ending at the most recent
 * Saturday on or before `todaySydneyDate`. Today counts if it is a Saturday and
 * the Push is complete; an incomplete TODAY does not break the run (a day in
 * progress is not a failed day), but a missed previous Saturday does.
 *
 * `fullPushDates` are "YYYY-MM-DD" Sydney dates on which every Push row was
 * done. Pure — the caller decides what "every row" meant that day.
 */
export function saturdayStreak(fullPushDates: Set<string>, todaySydneyDate: string): number {
  const [y, m, d] = todaySydneyDate.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const cursor = new Date(Date.UTC(y, m - 1, d));
  // Walk back to the most recent Saturday (UTC getDay on a civil date is zone-free).
  while (cursor.getUTCDay() !== 6) cursor.setUTCDate(cursor.getUTCDate() - 1);
  const key = (dt: Date) =>
    `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  let streak = 0;
  let first = true;
  for (let i = 0; i < 60; i++) {
    const k = key(cursor);
    if (fullPushDates.has(k)) streak++;
    else if (first && k === todaySydneyDate) { /* today, still in progress */ }
    else break;
    first = false;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return streak;
}
