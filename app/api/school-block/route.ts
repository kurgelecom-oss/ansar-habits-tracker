import { NextResponse } from "next/server";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";
import { getSchoolDay } from "../../lib/homeschool";
import { sydneyDateKey, sydneyNow } from "../../lib/time";
import { getHabits } from "../../lib/notion";
import { gateWindow, isWeekendDate, type GateContext } from "../../lib/gating";
import { assessmentLock } from "../../lib/assessments/gate";

/** The habit whose window the school blocks live inside. One tick of this id
 *  is the five-hour claim this table decomposes, so a block may only be
 *  recorded while that same window is open. */
const SCHOOL_HABIT = "homeschool_session";

/* ════════════════════════════════════════════════════════════════════════════
   /api/school-block — the per-subject record. PHASE 1.

   Five hours of school is currently ONE row in habit_completions
   ("homeschool_session"). That single row is why the system can say
   "school: yes" and can never say "he did Maths and skipped Science".

   This route records the blocks. It is ADDITIVE and it is deliberately NOT
   wired into the habits:

     • /api/tick is untouched. "homeschool_session" is still the tick that makes
       a school day done (and, in lib/weekend.ts, earns the weekend).
     • lib/scoring.ts and lib/gating.ts are untouched.
     • Nothing here can change a count. Writing a block is evidence.

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

   GATE PARITY — WHY POST IS NOT OPEN
   The table is hardened so anon cannot write to it, but this route holds the
   service role, so an ungated POST here would BE the bypass that hardening
   exists to prevent. Worse, Subject.rowId is served publicly by
   /api/homeschool, so the ids needed to post are discoverable by anyone.
   A block is therefore accepted only while the SAME window the
   "homeschool_session" tick obeys is open, and never on a weekend. The gate is
   imported from lib/gating.ts, not reimplemented here: a second copy of the
   rules is a second thing to drift. Those files are read, never modified.
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

  // GATE PARITY with /api/tick. Evidence recorded outside the hours school
  // actually runs is not evidence, and an ungated write here would undo
  // db/tick_hardening.sql by the back door.
  if (isWeekendDate(date)) {
    return NextResponse.json({
      ok: false, reason: "closed", message: "No school programme on the weekend.",
    }, { status: 409, headers: noStore });
  }

  // A paper is due: school blocks wait for it, the same as the Homeschool tick.
  const paper = await assessmentLock(date);
  if (paper.locked) {
    return NextResponse.json({ ok: false, reason: "locked", message: paper.message }, { status: 409, headers: noStore });
  }

  const now = sydneyNow();
  const school = (await getHabits()).find(h => h.id === SCHOOL_HABIT);
  if (school) {
    // gateWindow reads only serverDate and nowMinutes, but the context is
    // built in full and typed so a future gate cannot silently receive junk.
    const ctx: GateContext = {
      habits: [],
      completions: [],
      serverDate: date,
      nowMinutes: now.minutesOfDay,
      nowMs: now.ms,
      defaultDwellSeconds: 0,
      habitsLoaded: true,
    };
    const verdict = gateWindow(school, ctx, date);
    if (!verdict.allowed) {
      return NextResponse.json({
        ok: false, reason: verdict.reason, message: verdict.message,
      }, { status: 409, headers: noStore });
    }
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
