import { NextResponse } from "next/server";
import { readSnapshotRange } from "../../lib/school-snapshot";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";
import { addDays, sydneyDateKey } from "../../lib/time";
import { TERM, TRACKED, WEEKS, areaOfLabel, proofState, weekNumberOf, type Area, type ProofState } from "../../school/data/year";

/* /api/school-year — the term, week by week, for School → The year.
   Each subject's weekly proof is read from the block ticks the board already
   records (school_block_completions) against the stored programme. The Friday
   review is read from whether it was handed in. Nothing here is invented. */

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const today = sydneyDateKey();
  const currentWeek = weekNumberOf(today) ?? (today < TERM.start ? 0 : TERM.weeks + 1);
  const base = { today, currentWeek, configured: false as boolean, weeks: [] as unknown[] };
  if (!hasServiceRole()) return NextResponse.json(base, { headers: noStore });
  try {
    const db = adminClient();
    const [rows, ticks, attempts] = await Promise.all([
      readSnapshotRange(TERM.start, TERM.end),
      db.from("school_block_completions").select("notion_row_id, completed_date").gte("completed_date", TERM.start).lte("completed_date", TERM.end),
      db.from("ansar_assessment_attempts").select("paper_id, status").like("paper_id", "review:%:week"),
    ]);
    const done = new Set((ticks.data ?? []).map(r => `${r.notion_row_id}:${r.completed_date}`));
    const handedIn = new Set((attempts.data ?? []).filter(a => a.status !== "in_progress").map(a => a.paper_id as string));

    const weeks = WEEKS.map(w => {
      const end = addDays(w.start, 4);
      const mine = rows.filter(r => r.lesson_date >= w.start && r.lesson_date <= end);
      const proofs = Object.fromEntries(TRACKED.map(area => {
        const blocks = mine.filter(r => areaOfLabel(r.label) === area);
        const ticked = blocks.filter(r => done.has(`${r.notion_row_id}:${r.lesson_date}`)).length;
        return [area, { planned: blocks.length, done: ticked, state: proofState(blocks.length, ticked, w.n, currentWeek) }];
      })) as Record<Area, { planned: number; done: number; state: ProofState }>;
      const friday = end;
      const review: ProofState = handedIn.has(`review:${friday}:week`) ? "done"
        : w.n > currentWeek ? "upcoming" : today >= friday ? (w.n < currentWeek ? "missed" : "due") : "upcoming";
      const topics = [...new Set(mine.map(r => r.day_topic).filter(Boolean))];
      return { ...w, end, topics, proofs, review };
    });
    return NextResponse.json({ ...base, configured: true, weeks }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ ...base, message: (e as Error).message }, { headers: noStore });
  }
}
