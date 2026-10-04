import { NextResponse } from "next/server";
import { readSnapshotRange } from "../../lib/school-snapshot";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";
import { sydneyDateKey, sydneyWeekday, weekStartOf, addDays } from "../../lib/time";

/* ════════════════════════════════════════════════════════════════════════════
   /api/school-week — the whole school week, Monday to Friday.

   A homeschooled child currently cannot see his own week. He sees today and
   nothing else, while the rows for all five days already sit in Notion and,
   since Phase 2, in the board's own snapshot. This serves that.

   Reads the SNAPSHOT, not Notion: one query for five days instead of five
   round trips, and a Notion outage cannot empty this screen. It reports its
   own age, because a week edited this morning is not here until tonight.
   ══════════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStore = { "Cache-Control": "no-store" };
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("weekStart");
  const today = sydneyDateKey();
  // weekStartOf() is ISO: Sunday ENDS a week, so on a Sunday it returns the
  // Monday six days ago. For a school screen that is the wrong answer -- on
  // Saturday or Sunday the useful week is the one about to start, which is
  // also what the board already tells him ("the board is back Monday").
  const weekday = sydneyWeekday();
  const isWeekend = weekday === "Saturday" || weekday === "Sunday";
  const defaultStart = isWeekend ? addDays(weekStartOf(today), 7) : weekStartOf(today);
  const start = /^\d{4}-\d{2}-\d{2}$/.test(asked ?? "") ? (asked as string) : defaultStart;
  const end = addDays(start, 4);
  const upcoming = !asked && isWeekend;

  const emptyBody = { weekStart: start, weekEnd: end, today, upcoming, configured: false, days: [], weekTitle: "" };
  if (!hasServiceRole()) return NextResponse.json(emptyBody, { headers: noStore });

  try {
    const rows = await readSnapshotRange(start, end);

    // Completions for the same window, so the grid shows what was actually
    // done rather than only what was planned.
    const done = new Set<string>();
    const c = await adminClient()
      .from("school_block_completions")
      .select("notion_row_id, completed_date")
      .gte("completed_date", start)
      .lte("completed_date", end);
    for (const r of c.data ?? []) done.add(`${r.notion_row_id}:${r.completed_date}`);

    const byDate = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = byDate.get(r.lesson_date) ?? [];
      list.push(r);
      byDate.set(r.lesson_date, list);
    }

    const days = WEEKDAYS.map((name, i) => {
      const date = addDays(start, i);
      const blocks = byDate.get(date) ?? [];
      return {
        date,
        weekday: blocks[0]?.weekday ?? name,
        dayTopic: blocks[0]?.day_topic ?? "",
        note: blocks[0]?.day_note ?? "",
        isToday: date === today,
        blocks: blocks.map(b => ({
          rowId: b.notion_row_id,
          label: b.label,
          duration: b.duration,
          task: b.task,
          guide: b.guide,
          done: done.has(`${b.notion_row_id}:${b.lesson_date}`),
        })),
      };
    });

    return NextResponse.json({
      weekStart: start,
      weekEnd: end,
      today,
      /** True when it is the weekend and this is the week about to start,
       *  not the one containing today. The screen says so rather than
       *  implying these blocks are due now. */
      upcoming,
      configured: true,
      weekTitle: rows[0]?.week_title ?? "",
      syncedAt: (rows[0] as unknown as { synced_at?: string } | undefined)?.synced_at ?? null,
      days,
      totals: {
        blocks: rows.length,
        done: days.reduce((n, d) => n + d.blocks.filter(b => b.done).length, 0),
      },
    }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ ...emptyBody, message: (e as Error).message }, { headers: noStore });
  }
}
