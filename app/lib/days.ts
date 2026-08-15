/* ════════════════════════════════════════════════════════════════════════════
   WHICH HABITS APPLY ON WHICH DAY — one rule, both sides of the wire.

   Pure. No I/O, no Notion, no Supabase, no React. That matters: this module is
   imported by lib/notion.ts (SERVER, holds NOTION_TOKEN) *and* by page.tsx
   ("use client"). The rule had previously lived inline inside notion.ts, which
   the board could not reach without dragging the Notion token into the bundle —
   so the client scored every date against the full habit list instead, and a
   Saturday completion row still earned points on a day nothing was scheduled.

   The rule itself:

     • "Days" set        → the habit applies only on those days.
     • "Days" empty      → applies EVERY day, except…
     • …conditional block with Days empty → falls back to SOCCER_DAYS.

   The conditional fallback is a safety net, not the configuration. Every Active
   row now carries an explicit Days value (see scripts/set-habit-days.mjs), so
   the fallback is currently unreachable — it stays because an unset Days on a
   conditional habit would otherwise put soccer training on the board seven days
   a week while scoring.ts only ever pays for it on SOCCER_DAYS.
   ══════════════════════════════════════════════════════════════════════════ */

import { BLOCK_CONDITIONAL } from "./gating";
// Read-only import. scoring.ts is hash-synced byte-for-byte with
// family-dashboard and must not be modified — SOCCER_DAYS is consumed here, the
// same way lib/notion.ts already consumes it.
import { SOCCER_DAYS } from "./scoring";

/** The only two fields the day rule reads. Both Habit and NotionHabit satisfy it. */
export interface DayScoped {
  block: string;
  days: string[];
}

/**
 * Does this habit apply on `weekday`?
 *
 * @param weekday full name as Sydney reports it, e.g. "Saturday". Notion stores
 *                the three-letter form ("Sat"), so it is truncated here rather
 *                than at every call site.
 */
export function habitAppliesOn(habit: DayScoped, weekday: string): boolean {
  if (habit.days.length > 0) return habit.days.includes(weekday.slice(0, 3));
  if (habit.block === BLOCK_CONDITIONAL) return SOCCER_DAYS.includes(weekday);
  return true;
}

/**
 * The habits that apply on `weekday`. Generic so callers keep their own richer
 * type — the server passes Habit (with points, windows, dwell), the board passes
 * its NotionHabit view, and neither is widened to DayScoped on the way out.
 */
export function habitsOnDay<T extends DayScoped>(habits: T[], weekday: string): T[] {
  return habits.filter(h => habitAppliesOn(h, weekday));
}

/* ════════════════════════════════════════════════════════════════════════════
   WHICH HABITS SCORE — the second pure rule, and it lives here for the same
   reason the first one does: the server enforces it and the board displays it,
   so there must be exactly one copy.

   A PREREQUISITE earns nothing and counts toward nothing. It only unlocks. It
   is excluded from preIds, from baseIds and from the Today % denominator, so
   adding one in Notion moves no score, no percentage and no bonus — it only
   decides whether the habits after it in its block may be ticked at all.

   THE FLAG IS "Point Type", NOT "Points == 0", AND THAT IS MEASURED.
   Eleven of the fifteen currently-active habits already carry Points 0:

     bed_dressed quran fajr feet_floor movement breakfast goals  → "block"
     shower room_tidy teeth reading                              → "perfect_day_only"

   Excluding zero-point habits would drop the Today % denominator from 15 to 4
   and reduce a "perfect day" to three habits. Point Type is already the axis
   that says how a habit relates to scoring, and "perfect_day_only" is the proof
   it is the right one: zero points, still required for the perfect day.
   "prerequisite" is the next value along — zero points, required for nothing,
   unlocks its block.

   No existing row carries it, so this rule changes nothing until a row is
   deliberately marked in Notion.
   ══════════════════════════════════════════════════════════════════════════ */

/** The Notion "Point Type" value that marks an unlock-only habit. */
export const PREREQUISITE_POINT_TYPE = "prerequisite";

/**
 * The only field the scoring rule reads. Habit, NotionHabit and the board's gate
 * view all satisfy it. `pointType` is optional so a caller that has not got one
 * reads as "scores normally" rather than crashing — the same fail-safe direction
 * as everything else here.
 */
export interface PointTyped {
  pointType?: string | null;
}

/**
 * Is this habit an unlock-only prerequisite? Case- and space-insensitive, so a
 * hand-typed Notion select option cannot miss by a capital letter.
 */
export function isPrerequisite(habit: PointTyped): boolean {
  return (habit.pointType ?? "").trim().toLowerCase() === PREREQUISITE_POINT_TYPE;
}

/** The habits that count toward points, percentages and the perfect day. */
export function scoringHabits<T extends PointTyped>(habits: T[]): T[] {
  return habits.filter(h => !isPrerequisite(h));
}
