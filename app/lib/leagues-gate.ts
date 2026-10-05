/* ════════════════════════════════════════════════════════════════════════════
   LEAGUES AFTER SCHOOL (tk, 5 Oct 2026).

   The league tables, fixtures, results and stats are locked on a school day
   until that day's schoolwork is done. On Saturday and Sunday they are open
   all day.

   "Schoolwork done" is the same test the Stretch Wallet uses: every habit in
   the Homeschool block has a completion today. A parent override counts,
   because it writes the same completion row. A weekday that schedules no
   Homeschool habit (a term break) is open.

   ENFORCED ON THE SERVER. The two football data routes call leaguesLock() and
   send no tables while it is locked, so hiding the screen is not the lock.
   The next-match bar on Today is not covered: it stays visible as motivation.

   A Notion outage keeps it LOCKED on a weekday, on purpose. blockSatisfied()
   refuses to treat an unreadable habit list as "nothing scheduled", and an
   outage must not unlock anything.
   ══════════════════════════════════════════════════════════════════════════ */
import { createClient } from "@supabase/supabase-js";
import { BLOCK_SCHOOL, blockSatisfied, isWeekendDate, type GateCompletion, type GateContext } from "./gating";
import { getHabits, habitsForDay } from "./notion";
import { sydneyNow } from "./time";
import { assessmentLock } from "./assessments/gate";

export type LeaguesLock = { locked: false } | { locked: true; message: string };

export const LEAGUES_LOCKED_MESSAGE =
  "Locked until today's schoolwork is done. Tick the Homeschool session and this opens. It is open all weekend.";

/** The rule itself, with no I/O, so it can be tested on its own. */
export function leaguesLockFor(ctx: GateContext): LeaguesLock {
  if (isWeekendDate(ctx.serverDate)) return { locked: false };
  if (blockSatisfied(ctx, BLOCK_SCHOOL)) return { locked: false };
  return { locked: true, message: LEAGUES_LOCKED_MESSAGE };
}

export async function leaguesLock(): Promise<LeaguesLock> {
  const now = sydneyNow();
  // A paper that is due outranks everything, weekends included: an unfinished
  // Friday review keeps the tables shut on Saturday too.
  const paper = await assessmentLock(now.date);
  if (paper.locked) return { locked: true, message: paper.message };
  if (isWeekendDate(now.date)) return { locked: false };

  let habitsLoaded = true;
  const habitsAll = await getHabits().catch(() => { habitsLoaded = false; return []; });
  let completions: GateCompletion[] = [];
  try {
    const { data } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ).from("habit_completions").select("habit_id, completed_at").eq("completed_date", now.date);
    completions = (data ?? []) as GateCompletion[];
  } catch { /* unreadable record: stays locked, same as an outage */ }

  return leaguesLockFor({
    habits: habitsForDay(habitsAll, now.weekday),
    completions,
    serverDate: now.date,
    nowMinutes: now.minutesOfDay,
    nowMs: now.ms,
    defaultDwellSeconds: 0,
    habitsLoaded,
  });
}
