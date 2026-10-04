import { NextResponse } from "next/server";
import { requireCron } from "../../lib/assessments/auth";
import { compareToLive, syncSchoolSnapshot } from "../../lib/school-snapshot";
import { sydneyWeekday } from "../../lib/time";

/* ════════════════════════════════════════════════════════════════════════════
   /api/school-snapshot — write the board's copy, and prove it matches.

   GET  ?day=Monday   compare a live Notion read against the stored copy and
                      name every difference. Read-only, and the instrument the
                      phase gate is judged on.
   POST               re-sync the snapshot. Cron-secret protected, same as the
                      assessment maintenance path: this one writes.

   The board does NOT read this yet. getSchoolDay() still goes to Notion live.
   Add alongside, prove, then switch.
   ══════════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("day");
  const weekday = asked || sydneyWeekday();
  try {
    return NextResponse.json(await compareToLive(weekday), { headers: noStore });
  } catch (e) {
    return NextResponse.json(
      { weekday, match: false, differences: [(e as Error).message] },
      { status: 503, headers: noStore },
    );
  }
}

export async function POST(request: Request) {
  try {
    requireCron(request);
  } catch {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401, headers: noStore });
  }
  try {
    return NextResponse.json({ ok: true, ...(await syncSchoolSnapshot()) }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 503, headers: noStore });
  }
}
