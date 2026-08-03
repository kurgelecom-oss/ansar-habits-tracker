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
