import { NextResponse } from "next/server";
import { readSnapshotRange } from "../../lib/school-snapshot";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";
import { sydneyDateKey, weekStartOf, addDays } from "../../lib/time";
import { zoneStates } from "../../lib/targets";

/* /api/targets — this week's state for each Target Map zone. Read-only.
   On a weekend this is the week just finished (weekStartOf is ISO). */

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const start = weekStartOf(sydneyDateKey());
  const end = addDays(start, 6);
  if (!hasServiceRole()) return NextResponse.json({ weekStart: start, configured: false, zones: null }, { headers: noStore });

  try {
    const db = adminClient();
    const [rows, ticks, blocksDone] = await Promise.all([
      readSnapshotRange(start, addDays(start, 4)),
      db.from("habit_completions").select("habit_id, completed_date").gte("completed_date", start).lte("completed_date", end),
      db.from("school_block_completions").select("notion_row_id").gte("completed_date", start).lte("completed_date", end),
    ]);
    if (ticks.error) throw new Error(ticks.error.message);
    if (blocksDone.error) throw new Error(blocksDone.error.message);

    const dates = new Map<string, Set<string>>();
    for (const t of ticks.data ?? []) dates.set(t.habit_id, (dates.get(t.habit_id) ?? new Set()).add(t.completed_date));
    const habitDays = Object.fromEntries([...dates].map(([id, d]) => [id, d.size]));
    // A block finished on Friday's catch-up still counts, so match on row id, not date.
    const done = new Set((blocksDone.data ?? []).map(b => b.notion_row_id));
    const blocks = rows.map(r => ({ label: r.label, task: r.task, done: done.has(r.notion_row_id) }));

    return NextResponse.json({ weekStart: start, configured: true, zones: zoneStates({ habitDays, blocks }) }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ weekStart: start, configured: false, zones: null, message: (e as Error).message }, { headers: noStore });
  }
}
