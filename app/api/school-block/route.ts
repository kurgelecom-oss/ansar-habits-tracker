import { NextResponse } from "next/server";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";
import { getSchoolDay } from "../../lib/homeschool";
import { sydneyDateKey } from "../../lib/time";

/* ════════════════════════════════════════════════════════════════════════════
   /api/school-block — the per-subject record. PHASE 1.

   Five hours of school is currently ONE row in habit_completions
   ("homeschool_session"). That single row is why the system can say
   "school: yes" and can never say "he did Maths and skipped Science".

   This route records the blocks. It is ADDITIVE and it is deliberately NOT
   wired into points:

     • /api/tick is untouched. "homeschool_session" still pays its 5 points.
     • lib/scoring.ts and lib/gating.ts are untouched.
     • Nothing here can change a total. Writing a block is evidence, not score.

   The two paths run alongside each other until a week of real data shows they
   agree — "add alongside, prove, then switch", not "replace and hope".

   WHY THE SERVER RE-READS NOTION INSTEAD OF TRUSTING THE BODY
   The client sends a rowId and nothing else that matters. The subject label,
   day topic and task are read server-side from the same Daily Programme the
   board renders, then stored. A client that could name its own subject could
   claim a block that was never on the timetable — the same hole
   db/tick_hardening.sql closed for habit_completions.

   WHY THE STORED COLUMNS ARE DENORMALISED
   A Notion row can be re-dated, re-labelled or deleted. The evidence of what
   was ticked on a given day must not change when it is.
   ══════════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store" };

/** Today's blocks and which of them are recorded. Read-only. */
export async function GET() {
  const date = sydneyDateKey();
  const day = await getSchoolDay();
  const blocks = day.subjects.map(s => ({ rowId: s.rowId, name: s.name, duration: s.duration }));

  if (!hasServiceRole()) {
    return NextResponse.json(
      { date, blocks, done: [], configured: false },
      { headers: noStore },
    );
  }

  const { data, error } = await adminClient()
    .from("school_block_completions")
    .select("notion_row_id, subject_label, completed_at")
    .eq("completed_date", date);

  if (error) {
    // A missing table is the expected state until db/school_block_completions.sql
    // has been run. Say so plainly rather than 500-ing: this route is evidence,
    // and nothing on the board depends on it yet.
    return NextResponse.json(
      { date, blocks, done: [], configured: false, message: error.message },
      { headers: noStore },
    );
  }

  return NextResponse.json({
    date,
    blocks,
    done: (data ?? []).map(r => r.notion_row_id),
    configured: true,
  }, { headers: noStore });
}

/** Record one block as done. Idempotent: re-ticking updates, never duplicates. */
export async function POST(request: Request) {
  if (!hasServiceRole()) {
    return NextResponse.json({
      ok: false,
      reason: "not_configured",
      message: "Server cannot write: SUPABASE_SERVICE_ROLE_KEY is not set for this deploy.",
    }, { status: 503, headers: noStore });
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2000) throw new Error("too large");
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("shape");
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400, headers: noStore });
  }

  const rowId = typeof body.rowId === "string" ? body.rowId.replace(/-/g, "") : "";
  if (!rowId) {
    return NextResponse.json({ ok: false, reason: "bad_request", message: "rowId is required." },
      { status: 400, headers: noStore });
  }

  // The block must be on TODAY's timetable, read from Notion server-side. This
  // is the whole validation: a row id that is not in today's card cannot be
  // recorded, so a block cannot be claimed for a day it was never set for.
  const date = sydneyDateKey();
  const day = await getSchoolDay();
  const subject = day.subjects.find(s => s.rowId === rowId);
  if (!subject) {
    return NextResponse.json({
      ok: false,
      reason: "not_on_todays_programme",
      message: "That block is not on today's programme.",
    }, { status: 409, headers: noStore });
  }

  const { error } = await adminClient()
    .from("school_block_completions")
    .upsert({
      notion_row_id: rowId,
      completed_date: date,
      subject_label: subject.name,
      day_topic: day.dayLabel || null,
      task: subject.detail || null,
      completed_at: new Date().toISOString(),
    }, { onConflict: "notion_row_id,completed_date" });

  if (error) {
    return NextResponse.json({
      ok: false,
      reason: "write_failed",
      message: error.message,
      hint: (error as { hint?: string }).hint ?? null,
    }, { status: 500, headers: noStore });
  }

  return NextResponse.json({ ok: true, rowId, date, subject: subject.name }, { headers: noStore });
}
