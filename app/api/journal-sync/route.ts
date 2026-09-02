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

   THE ONE-DAY GRACE.
   ─────────────────
   Because the board is the trigger, a journal filed from his phone at 21:30 on
   the standalone tally.so link — with the dashboard shut — would have been
   evaluated the next morning, against the NEXT day, and lost silently. So this
   route considers today AND yesterday, and writes each day that has a journal
   and no completion. "You have until the end of the next day."

   That back-dates a completion, which gateWindow() flatly refuses to do for a
   TAP. The two are not the same act. A tap queued overnight proves nothing
   about when the work happened; a Tally submission is timestamped server-side
   by Tally and cannot be forged from the phone. The evidence carries its own
   date, so honouring it is not batching.

   IT DOES NOT DOUBLE-CREDIT. lib/tally.ts assigns every submission to exactly
   one day ("the date he puts on the form is the day it counts for") rather than
   asking each day whether any submission could match it. Before that change a
   journal written at 07:39 Thursday and honestly dated Wednesday matched
   Wednesday by its date field AND Thursday by its landing time — one piece of
   writing, two ticks. Days now ask which submissions they own, so no submission
   can belong to two of them.

   EACH DAY IS CHECKED AGAINST ITS OWN SCHEDULE. The journal is Mon–Fri. Asking
   "is the journal scheduled today?" once, up front, would mean every Friday
   journal filed on a Saturday morning is discarded — Saturday schedules no
   journal, so the whole request would bail before it ever looked at Friday.
   ══════════════════════════════════════════════════════════════════════════ */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addDays, dayNameOf, sydneyNow } from "../../lib/time";
import { getHabits, habitsForDay } from "../../lib/notion";
import { getJournalEvidenceMap } from "../../lib/tally";
import { AUTO_TICKED_IDS } from "../../lib/evidence-gate";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store" };

/**
 * How many days back the grace reaches. One.
 *
 * It exists to cover "filed it on my phone last night, opened the board this
 * morning", and one day covers that completely. Widening it would start
 * rewriting score history further back than anybody remembers, for a case that
 * does not happen — and every extra day is another day a mis-dated form could
 * silently resurrect.
 */
const GRACE_DAYS = 1;

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

  /* The FULL habit list, not today's slice. Each day in the grace window is
     filtered against its own weekday below — a Saturday request still has to be
     able to see Friday's journal row. */
  let habitsAll;
  try {
    habitsAll = await getHabits(false);
  } catch (e) {
    return NextResponse.json({
      ok: false, ticked: false, reason: "habits_unavailable",
      message: e instanceof Error ? e.message : "habit load failed",
    }, { status: 503, headers: noStore });
  }

  /* FRESH, ALWAYS. This route runs only when the caller already believes there
     is something to write, so the 30-second memo can only make it wrong. A
     journal submitted seconds ago must not be missed for being newer than a
     cache — that is the whole reason the child trusts the form.

     ONE read covers every day in the window. */
  const evidence = await getJournalEvidenceMap(true);

  if (!evidence.configured || evidence.error) {
    // No key, or Tally could not be reached. Reported, never guessed at: an
    // unreachable form is not the same fact as an unwritten journal, and this
    // route must not turn the first into the second by writing nothing quietly.
    return NextResponse.json({
      ok: true, ticked: false,
      reason: evidence.configured ? "evidence_unavailable" : "not_configured",
      message: evidence.error, serverDate: now.date,
    }, { headers: noStore });
  }

  // Today first, then back through the grace. Newest first only so the response
  // reads in the order a person would ask about it.
  const window: string[] = [];
  for (let back = 0; back <= GRACE_DAYS; back++) window.push(addDays(now.date, -back));

  // One query for the whole window rather than one per day.
  const { data: existingRows } = await readClient()
    .from("habit_completions")
    .select("habit_id, completed_date, completed_at")
    .in("completed_date", window)
    .in("habit_id", AUTO_TICKED_IDS as string[]);
  const existing = new Map(
    (existingRows ?? []).map((r: { habit_id: string; completed_date: string; completed_at: string }) =>
      [`${r.habit_id}|${r.completed_date}`, r.completed_at]),
  );

  type DayResult = {
    date: string; ticked: boolean; reason: string;
    habitId?: string; completedAt?: string; submittedAt?: string | null;
  };
  const days: DayResult[] = [];
  const writes: { habit_id: string; completed_date: string; completed_at: string }[] = [];

  for (const date of window) {
    /* THAT DAY's schedule, not today's. The journal is Mon–Fri: asking about
       today would discard every Friday journal filed on a Saturday morning. */
    const habit = habitsForDay(habitsAll, dayNameOf(date))
      .find(h => AUTO_TICKED_IDS.includes(h.id));
    if (!habit) { days.push({ date, ticked: false, reason: "not_scheduled" }); continue; }

    const hit = evidence.byDate[date];
    if (!hit) { days.push({ date, ticked: false, reason: "no_journal" }); continue; }

    // Already recorded — by an earlier sync, a manual tap, or a parent override.
    const already = existing.get(`${habit.id}|${date}`);
    if (already) {
      days.push({
        date, ticked: false, reason: "already_done",
        habitId: habit.id, completedAt: already, submittedAt: hit.submittedAt,
      });
      continue;
    }

    /* THE TIMESTAMP IS THIS SERVER'S, not Tally's `submittedAt`.
       Same rule /api/tick states at the top of its file, and kept for the same
       reason: there is exactly one clock anything is ever recorded against, and
       admitting a second — even an honest one from a trusted API — is how the
       dwell arithmetic in lib/gating.ts starts seeing completions that predate
       the block they belong to. Tally's own timestamp is not discarded; it is
       returned below and reported by /api/tick as
       `journalEvidence.submittedAt`, which is where "when was it written" lives. */
    writes.push({
      habit_id: habit.id, completed_date: date,
      completed_at: new Date(now.ms).toISOString(),
    });
    days.push({
      date, ticked: true, reason: "written",
      habitId: habit.id,
      completedAt: new Date(now.ms).toISOString(),
      submittedAt: hit.submittedAt,
    });
  }

  if (writes.length === 0) {
    return NextResponse.json(
      { ok: true, ticked: false, serverDate: now.date, days },
      { headers: noStore },
    );
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
    .upsert(writes, {
      // First write wins. Without this a row's completed_at would be rewritten
      // on every poll and creep forward all evening.
      onConflict: "habit_id,completed_date", ignoreDuplicates: true,
    });

  if (error) {
    return NextResponse.json({
      ok: false, ticked: false, reason: "write_failed",
      message: error.message,
      hint: (error as { hint?: string }).hint ?? null,
      serverDate: now.date, days,
    }, { status: 500, headers: noStore });
  }

  return NextResponse.json(
    { ok: true, ticked: true, serverDate: now.date, days },
    { headers: noStore },
  );
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
