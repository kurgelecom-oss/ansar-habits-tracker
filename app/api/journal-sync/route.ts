/* ════════════════════════════════════════════════════════════════════════════
   /api/journal-sync — filing the Tally journal IS the tick.

   tk, 2 Sep 2026: "just complete the tally form journal to earn the tick". No
   second tap, no window to catch, nothing else to do with the journal.

   ONE HABIT, ONE FORM, ONE QUESTION. It writes `journal` and nothing else, and
   only on a completed "Daily Journal" submission from Ansar on form ODKlVa with
   a non-empty entry, dated today. A work submission or a daily-goals entry —
   the other two things that same form takes, several a day — writes nothing.
   lib/tally.ts owns that matching; this route owns only the consequence.

   WHY IT IS ITS OWN ROUTE AND NOT PART OF /api/tick.
   ─────────────────────────────────────────────────
   /api/tick's GET says of itself "It writes nothing", and that is load-bearing:
   it is the diagnostic every verification in this repo reads, and a diagnostic
   with side effects cannot be trusted to describe the state it just changed.
   Folding an auto-tick into it would make every poll a write. So the write
   lives here, the board calls it only when it has already SEEN work to do, and
   the GET stays a pure read.

   WHY THE BOARD DRIVES IT RATHER THAN A WEBHOOK.
   ─────────────────────────────────────────────
   A Tally webhook would be the tidier trigger, but it is a paid Tally feature
   and this must work on the plan the family actually has. The board already
   polls /api/tick every 30s and already learns `journalEvidence.found` for free
   on every one of those polls — so it fires this route only when that flag is
   true AND the journal row is not yet DONE. Zero extra Tally calls in the
   steady state, one POST only when there is genuinely a completion to write.

   THE COST OF THAT CHOICE, STATED PLAINLY: the tick lands the next time the
   board is open, not the instant the form is submitted. In practice they are
   the same moment — the form is opened FROM the board, in a modal, and the
   submit handler refreshes immediately. A journal filed from a phone with the
   board closed ticks when the board is next opened. It is never lost.

   IDEMPOTENT, AND FIRST WRITE WINS. `ignoreDuplicates` means a second call for
   the same day is a no-op rather than a rewrite of `completed_at`. Polling this
   route cannot walk the recorded time forward.
   ══════════════════════════════════════════════════════════════════════════ */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sydneyNow } from "../../lib/time";
import { getHabits, habitsForDay } from "../../lib/notion";
import { getJournalEvidence } from "../../lib/tally";
import { AUTO_TICKED_IDS } from "../../lib/evidence-gate";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store" };

/** Read-only client. Anon is sufficient — RLS keeps SELECT open to anon. */
function readClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Record today's journal, if Tally says there is one and nothing has recorded it
 * yet.
 *
 * ALWAYS 200 ON A NON-EVENT. "No journal today", "already done" and "not
 * scheduled" are all ordinary answers to a poll, not errors — the board asks
 * this question repeatedly by design, and a 4xx for the usual case would bury
 * the real failures in noise. `ticked` is the only field a caller must read;
 * `reason` says why when it is false.
 */
export async function POST() {
  const now = sydneyNow();                       // ← the server's own clock

  let habits;
  try {
    habits = habitsForDay(await getHabits(false), now.weekday);
  } catch (e) {
    return NextResponse.json({
      ok: false, ticked: false, reason: "habits_unavailable",
      message: e instanceof Error ? e.message : "habit load failed",
    }, { status: 503, headers: noStore });
  }

  /* Only a habit Notion actually schedules today. The journal is Mon–Fri, so
     without this a Saturday submission would write a completion for a habit the
     board does not render — an orphan row that scores nothing and explains
     nothing. The list is read from Notion rather than assumed, so moving the
     journal's Days moves this with it. */
  const habit = habits.find(h => AUTO_TICKED_IDS.includes(h.id));
  if (!habit) {
    return NextResponse.json(
      { ok: true, ticked: false, reason: "not_scheduled", serverDate: now.date },
      { headers: noStore },
    );
  }

  /* FRESH, ALWAYS. This route runs only when the caller already believes there
     is something to write, so the 30-second memo can only make it wrong. A
     journal submitted seconds ago must not be missed for being newer than a
     cache — that is the whole reason the child trusts the form. */
  const evidence = await getJournalEvidence(now.date, true);

  if (!evidence.configured) {
    return NextResponse.json({
      ok: true, ticked: false, reason: "not_configured",
      message: evidence.error, serverDate: now.date,
    }, { headers: noStore });
  }
  if (evidence.error) {
    // Tally could not be reached. Reported, never guessed at: an unreachable
    // form is not the same fact as an unwritten journal, and this route must
    // not turn the first into the second by writing nothing quietly.
    return NextResponse.json({
      ok: true, ticked: false, reason: "evidence_unavailable",
      message: evidence.error, serverDate: now.date,
    }, { headers: noStore });
  }
  if (!evidence.found) {
    return NextResponse.json(
      { ok: true, ticked: false, reason: "no_journal_today", serverDate: now.date },
      { headers: noStore },
    );
  }

  // Already recorded — by an earlier sync, by a manual tap, or by a parent
  // override. Checked before the write so the ordinary polling case costs one
  // cheap SELECT and no write at all.
  const { data: existing } = await readClient()
    .from("habit_completions")
    .select("habit_id, completed_at")
    .eq("completed_date", now.date)
    .eq("habit_id", habit.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true, ticked: false, reason: "already_done",
      habitId: habit.id, serverDate: now.date,
      completedAt: (existing as { completed_at: string }).completed_at,
      submittedAt: evidence.submittedAt,
    }, { headers: noStore });
  }

  if (!hasServiceRole()) {
    return NextResponse.json({
      ok: false, ticked: false, reason: "not_configured",
      message: "Server cannot write: SUPABASE_SERVICE_ROLE_KEY is not set for this deploy.",
    }, { status: 503, headers: noStore });
  }

  /* THE TIMESTAMP IS THIS SERVER'S, not Tally's `submittedAt`.
     Same rule /api/tick states at the top of its file, and it is kept here for
     the same reason: there is exactly one clock in this app that anything is
     ever recorded against, and admitting a second one — even an honest one from
     a trusted API — is how the dwell arithmetic in lib/gating.ts starts seeing
     completions that predate the block they belong to. Tally's own timestamp is
     not discarded; it is returned below and reported by /api/tick as
     `journalEvidence.submittedAt`, which is where "when was it written" lives. */
  const { error } = await adminClient()
    .from("habit_completions")
    .upsert(
      { habit_id: habit.id, completed_date: now.date, completed_at: new Date(now.ms).toISOString() },
      // First write wins. Without this the row's completed_at would be rewritten
      // on every poll and creep forward all evening.
      { onConflict: "habit_id,completed_date", ignoreDuplicates: true },
    );

  if (error) {
    return NextResponse.json({
      ok: false, ticked: false, reason: "write_failed",
      message: error.message,
      hint: (error as { hint?: string }).hint ?? null,
    }, { status: 500, headers: noStore });
  }

  return NextResponse.json({
    ok: true,
    ticked: true,
    habitId: habit.id,
    serverDate: now.date,
    completedAt: new Date(now.ms).toISOString(),
    // Where the tick came from. This is the audit trail — no override_log row is
    // written, because the gold badge must keep meaning "a parent restored this".
    submittedAt: evidence.submittedAt,
  }, { headers: noStore });
}

/**
 * GET is deliberately not implemented.
 *
 * This route WRITES. Leaving a GET on it would put a state change one address
 * bar away, reachable by a prefetch, a link preview or a crawler.
 */
export async function GET() {
  return NextResponse.json(
    { ok: false, message: "POST only — this route writes." },
    { status: 405, headers: noStore },
  );
}
