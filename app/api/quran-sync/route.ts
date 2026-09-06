/* ════════════════════════════════════════════════════════════════════════════
   /api/quran-sync — finishing a Quran OS session IS the `quran` tick.

   tk, 6 Sep 2026: Ansar's Qur'an sessions "need to be tracked via this app"
   (Quran OS). So the tick comes from Quran OS's record of a FINISHED session,
   exactly as the journal tick comes from the Tally form — see
   /api/journal-sync for the full reasoning; every design choice there holds
   here and is not repeated:

   • Its own route, not part of /api/tick, so the GET stays a pure read.
   • The board drives it, only when /api/tick's `quranEvidence.found` is true
     and the row is not yet DONE. Zero extra requests in the steady state.
   • Idempotent, first write wins (`ignoreDuplicates`).
   • One-day grace: a session finished last night with the board shut is
     honoured the next morning. Quran OS dates its sessions itself, on the
     same Australian clock, so the date is the evidence's own.
   • The timestamp written is THIS server's, never Quran OS's `endedAt`.
   • Each day is checked against ITS OWN schedule (the habit is Mon–Fri).
   • No override_log row: the audit trail is the Quran OS session itself
     (`qos_sessions`, mirrored to the Notion Session Log).

   Writes the `quran` habit and nothing else. AUTO_TICKED_IDS is deliberately
   NOT widened — /api/journal-sync picks "the auto-ticked habit of the day"
   from that list, and a second id there would make it pick the wrong row.
   ══════════════════════════════════════════════════════════════════════════ */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addDays, dayNameOf, sydneyNow } from "../../lib/time";
import { getHabits, habitsForDay } from "../../lib/notion";
import { getQuranEvidenceMap, QURAN_HABIT_ID } from "../../lib/quran-os";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store" };
const GRACE_DAYS = 1;

function readClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function POST() {
  const now = sydneyNow();

  let habitsAll;
  try {
    habitsAll = await getHabits(false);
  } catch (e) {
    return NextResponse.json({
      ok: false, ticked: false, reason: "habits_unavailable",
      message: e instanceof Error ? e.message : "habit load failed",
    }, { status: 503, headers: noStore });
  }

  const evidence = await getQuranEvidenceMap(true);
  if (!evidence.configured || evidence.error) {
    return NextResponse.json({
      ok: true, ticked: false,
      reason: evidence.configured ? "evidence_unavailable" : "not_configured",
      message: evidence.error, serverDate: now.date,
    }, { headers: noStore });
  }

  const window: string[] = [];
  for (let back = 0; back <= GRACE_DAYS; back++) window.push(addDays(now.date, -back));

  const { data: existingRows } = await readClient()
    .from("habit_completions")
    .select("habit_id, completed_date, completed_at")
    .in("completed_date", window)
    .eq("habit_id", QURAN_HABIT_ID);
  const existing = new Map(
    (existingRows ?? []).map((r: { completed_date: string; completed_at: string }) => [r.completed_date, r.completed_at]),
  );

  type DayResult = { date: string; ticked: boolean; reason: string; completedAt?: string; endedAt?: string | null; minutes?: number };
  const days: DayResult[] = [];
  const writes: { habit_id: string; completed_date: string; completed_at: string }[] = [];

  for (const date of window) {
    const habit = habitsForDay(habitsAll, dayNameOf(date)).find(h => h.id === QURAN_HABIT_ID);
    if (!habit) { days.push({ date, ticked: false, reason: "not_scheduled" }); continue; }
    const hit = evidence.byDate[date];
    if (!hit) { days.push({ date, ticked: false, reason: "no_session" }); continue; }
    const already = existing.get(date);
    if (already) { days.push({ date, ticked: false, reason: "already_done", completedAt: already, endedAt: hit.endedAt, minutes: hit.minutes }); continue; }
    const completedAt = new Date(now.ms).toISOString();
    writes.push({ habit_id: QURAN_HABIT_ID, completed_date: date, completed_at: completedAt });
    days.push({ date, ticked: true, reason: "written", completedAt, endedAt: hit.endedAt, minutes: hit.minutes });
  }

  if (writes.length === 0) {
    return NextResponse.json({ ok: true, ticked: false, serverDate: now.date, days }, { headers: noStore });
  }
  if (!hasServiceRole()) {
    return NextResponse.json({
      ok: false, ticked: false, reason: "not_configured",
      message: "Server cannot write: SUPABASE_SERVICE_ROLE_KEY is not set for this deploy.",
      serverDate: now.date, days,
    }, { status: 503, headers: noStore });
  }

  const { error } = await adminClient()
    .from("habit_completions")
    .upsert(writes, { onConflict: "habit_id,completed_date", ignoreDuplicates: true });
  if (error) {
    return NextResponse.json({
      ok: false, ticked: false, reason: "write_failed", message: error.message,
      hint: (error as { hint?: string }).hint ?? null, serverDate: now.date, days,
    }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ ok: true, ticked: true, serverDate: now.date, days }, { headers: noStore });
}

/** GET is deliberately not implemented — this route writes. */
export async function GET() {
  return NextResponse.json({ ok: false, message: "POST only — this route writes." }, { status: 405, headers: noStore });
}
