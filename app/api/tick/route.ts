/* ════════════════════════════════════════════════════════════════════════════
   /api/tick — the ONLY way a habit completion is ever written.

   WHY THIS IS A NEXT ROUTE HANDLER AND NOT netlify/functions/tick.js
   ─────────────────────────────────────────────────────────────────
   The brief asked for netlify/functions/tick.js → /api/tick. This repo is a
   Next.js App Router app deployed through @netlify/plugin-nextjs: there is no
   netlify/functions directory, netlify.toml declares no functions build, and
   the plugin owns /api/* at the edge. A bare Netlify function would publish at
   /.netlify/functions/tick (verified: that path 404s on the live site today) and
   would need a redirect that races the plugin's own /api/* routing.

   The existing, working precedent in this repo is app/api/stretch-items/route.ts
   — a Next route handler that serves at /api/stretch-items in production and
   keeps NOTION_TOKEN server-side. This file follows it exactly. Same URL the
   brief asked for, same server-side secrecy, no redirect ordering to lose to.

   THE CONTRACT
   ────────────
   POST /api/tick   { habitId, date, overridePin? }
     • `date` is VALIDATED against the server's Sydney date, never trusted.
     • No timestamp is accepted from the client. Any `timestamp`, `completedAt`
       or `now` in the body is ignored outright — the value written is
       new Date() on this server.
     • Returns 200 { ok:true, ... } or 409 { ok:false, reason, message }.

   GET /api/tick    read-only diagnostic
     • Server's Sydney clock plus every habit's current gate verdict.
     • Uses the ANON key, so it answers even before the service role is
       configured. It writes nothing.
   ══════════════════════════════════════════════════════════════════════════ */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sydneyNow } from "../../lib/time";
import {
  evaluateGates,
  buttonState,
  buttonLabel,
  windowWarnings,
  type GateContext,
  type GateCompletion,
} from "../../lib/gating";
import { getHabits, getSettings, habitsForDay, SETTINGS_FALLBACK, type Habit } from "../../lib/notion";
import { isPrerequisite } from "../../lib/days";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";
import { lockoutState, recordFailure, clearFailures, lockoutBackend, LOCKOUT_MAX_FAILURES } from "../../lib/pin-lockout";

// Never prerendered, never cached: the answer depends on the current second.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ── Client identity for the lockout ────────────────────────────────────────
   The lockout tally itself lives in Postgres (lib/pin-lockout.ts). It used to
   be a Map right here, which is why it never fired: one Map per warm Lambda,
   and Netlify spreads requests across them. */
function clientKey(request: Request): string {
  const h = request.headers;
  return (
    h.get("x-nf-client-connection-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

/** Read-only client. Anon is sufficient — RLS keeps SELECT open to anon. */
function readClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Why the habit list came back empty, if it did. Surfaced by the GET diagnostic
 * because "no habits" and "Notion unreachable" look identical from outside and
 * have completely different fixes — the second one means every habit is
 * un-tickable until an env var is corrected.
 */
let lastHabitsError: string | null = null;

/* ── The rejection ledger ────────────────────────────────────────────────────
   Every 409 this route returns is also written to public.tick_rejections.

   WHY. Until now a refusal existed only as an HTTP response. "Did he tap and
   get bounced, or never tap at all?" was unanswerable the next morning, because
   habit_completions records successes and nothing records failures — a missing
   row looks identical either way. The two habits missed on 2026-08-10 are the
   case in point: the rows are absent, and nothing in the database says whether
   the child tapped into a closed window or never reached for it.

   BEST-EFFORT, ALWAYS. A refusal is already the answer to the request; the log
   is bookkeeping layered behind it. Nothing in here may change a status code, a
   reason string or a response body, and a broken ledger must never turn a plain
   "Opens 6:30am" into a 500. Hence: awaited, so the row lands before the
   response is sent, but wrapped so nothing it does can escape.

   NOT SILENT, THOUGH. A swallowed error nobody surfaces is how a log quietly
   stops logging for a month. The failure is parked in lastRejectionLogError and
   reported by the GET diagnostic, exactly as lastHabitsError above already is. */
let lastRejectionLogError: string | null = null;

async function logRejection(row: {
  habitId: string;
  serverDate: string;
  reason: string;
  detail: string;
  nowMinutes: number;
}): Promise<void> {
  try {
    // The same service-role client that writes habit_completions. anon holds no
    // grant on tick_rejections, so nothing else on earth can reach this table.
    if (!hasServiceRole()) {
      lastRejectionLogError = "no service role — rejection not logged";
      return;
    }
    const { error } = await adminClient().from("tick_rejections").insert({
      habit_id: row.habitId,
      rejected_date: row.serverDate,
      reason: row.reason,
      detail: row.detail,
      now_minutes: row.nowMinutes,
    });
    lastRejectionLogError = error ? error.message : null;
  } catch (e) {
    lastRejectionLogError = e instanceof Error ? e.message : "rejection log failed";
  }
}

/* ── GATE 5 — PREREQUISITE ───────────────────────────────────────────────────
   A habit whose Notion "Point Type" is `prerequisite` earns nothing and counts
   toward nothing (see lib/days.ts). It only unlocks: every prerequisite in a
   block must be recorded before any scoring habit in that same block may be
   ticked.

   WHY IT IS HERE AND NOT IN lib/gating.ts. That file is frozen — it is the
   four-gate contract and its GateReason union is part of the API. This gate
   needs a reason string of its own, so it layers in front rather than editing
   the gauntlet. Same shape as the four: pure, no I/O, decided against the
   server's own clock via the ctx it is handed.

   It is DATA-DRIVEN, not a hardcoded id. Nothing here names "journal" or
   "homeschool_session"; marking a different row in Notion moves the gate. */
function gatePrerequisite(
  habit: Habit,
  habits: Habit[],
  ctx: GateContext,
): { reason: string; message: string } | null {
  // A prerequisite does not gate itself, or the other prerequisites beside it.
  if (isPrerequisite(habit)) return null;

  const done = new Set(ctx.completions.map(c => c.habit_id));
  // Lowest Order first, so the message names the one to do next rather than an
  // arbitrary member of the set — the same courtesy gateOrder extends.
  const blocking = habits
    .filter(h => h.block === habit.block && isPrerequisite(h) && !done.has(h.id))
    .sort((a, b) => a.order - b.order)[0];

  if (!blocking) return null;
  // The wording and the curly quotes match gateOrder's, because to a child this
  // is the same sentence — only the ledger needs to tell the two apart.
  return { reason: "journal_required", message: `Do “${blocking.name}” first` };
}

/**
 * Today's context, plus the RICH habit rows it was built from.
 *
 * GateContext narrows habits to GateHabit, which carries no `pointType` — and
 * gate 5 is decided on exactly that field. The rows are already full Habit
 * objects at runtime (habitsForDay returns them), so this hands both views back
 * rather than casting the narrow one back up somewhere less visible.
 */
async function loadContext(fresh: boolean): Promise<{ ctx: GateContext; habits: Habit[] }> {
  const now = sydneyNow();                       // ← the server's own clock

  const [habitsAll, settings] = await Promise.all([
    getHabits(fresh).then(h => { lastHabitsError = null; return h; }).catch((e: unknown) => {
      // The message is Notion's status line ("Notion <id>: 401 Unauthorized") or
      // "Missing NOTION_TOKEN". Neither contains the token itself.
      lastHabitsError = e instanceof Error ? e.message : "habit load failed";
      return [] as Awaited<ReturnType<typeof getHabits>>;
    }),
    getSettings(fresh).catch(() => SETTINGS_FALLBACK),
  ]);
  const habits = habitsForDay(habitsAll, now.weekday);

  const { data } = await readClient()
    .from("habit_completions")
    .select("habit_id, completed_at")
    .eq("completed_date", now.date);

  return {
    ctx: {
      habits,
      completions: (data ?? []) as GateCompletion[],
      serverDate: now.date,
      nowMinutes: now.minutesOfDay,
      nowMs: now.ms,
      defaultDwellSeconds: settings.defaultDwellSeconds,
      // Distinguishes "Saturday schedules nothing" from "Notion is down" — both
      // produce an empty habits array. lastHabitsError is cleared on success and
      // set by the catch above, so it is the honest signal. See blockSatisfied().
      habitsLoaded: lastHabitsError === null,
    },
    habits,
  };
}

/* ── GET — read-only diagnostic ──────────────────────────────────────────── */

export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  try {
    const now = sydneyNow();
    const { ctx, habits: richHabits } = await loadContext(fresh);

    let lock = { remainingMs: 0, failures: 0 };
    let lockBackend: string | null = null;
    if (hasServiceRole()) {
      lock = await lockoutState(clientKey(request), now.ms).catch(() => ({ remainingMs: 0, failures: 0 }));
      lockBackend = await lockoutBackend().catch(() => null);
    }

    let overridden: string[] = [];
    let overrideLogToday: unknown[] = [];
    // Refusals recorded today. Read back here for the same reason overrideLogToday
    // is: tick_rejections is service-role-only, so this endpoint is the only way
    // to see it without a database client. It is also how a broken ledger is
    // caught — rejectionLogError below reports an insert that did not land.
    let rejectionsToday: unknown[] = [];
    let rejectionLogReadError: string | null = null;
    if (hasServiceRole()) {
      const { data } = await adminClient()
        .from("override_log")
        .select("*")
        .eq("date", now.date);
      overrideLogToday = (data ?? []).filter((r: { habit_id: string }) => r.habit_id !== "__pin_attempt__");
      overridden = Array.from(new Set(
        (overrideLogToday as { habit_id: string }[]).map(r => r.habit_id)));

      const rej = await adminClient()
        .from("tick_rejections")
        .select("*")
        .eq("rejected_date", now.date)
        .order("rejected_at", { ascending: false })
        .limit(20);
      rejectionsToday = rej.data ?? [];
      rejectionLogReadError = rej.error ? rej.error.message : null;
    }

    return NextResponse.json({
      ok: true,
      serverTime: {
        // Proof of which clock the gates are using. If this ever disagrees with
        // a phone in Sydney, every gate below is suspect.
        timeZone: "Australia/Sydney",
        date: now.date,
        weekday: now.weekday,
        clock: `${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}:${String(now.second).padStart(2, "0")}`,
        minutesOfDay: now.minutesOfDay,
        utcIso: now.iso,
      },
      serviceRoleConfigured: hasServiceRole(),
      overridePinConfigured: Boolean(process.env.PARENT_OVERRIDE_PIN),
      // Lockout is reported so the dialog can show a live countdown after a
      // page refresh, not only in the response to a refused attempt.
      overrideLockedMs: lock.remainingMs,
      overrideFailures: lock.failures,
      lockoutBackend: lockBackend,
      // Habits completed by a parent override today. override_log is readable
      // only by the service role — anon sees nothing — so the server resolves
      // it and the board just renders the marker.
      overriddenHabitIds: overridden,
      // Full audit rows for today. override_log is service-role-only, so this
      // is the only way to read it back without a database client.
      overrideLogToday,
      // The rejection ledger, today only, newest first. Empty is a real answer:
      // it means nothing was refused, not that logging is broken — the two error
      // fields below are what tell those apart.
      rejectionsToday,
      rejectionLogError: lastRejectionLogError,
      rejectionLogReadError,
      notionConfigured: Boolean(process.env.NOTION_TOKEN),
      habitsError: lastHabitsError,
      // The three booleans above are the whole configuration story, and they
      // distinguish the failure that actually happened here: on the deploy
      // preview, SUPABASE_SERVICE_ROLE_KEY and PARENT_OVERRIDE_PIN were both
      // PRESENT as env var names but held EMPTY values, so a name check would
      // have said "configured" while every write still 503'd. Test the value,
      // never the key's existence.
      defaultDwellSeconds: ctx.defaultDwellSeconds,
      warnings: windowWarnings(ctx.habits),
      habits: richHabits.map(h => {
        const verdict = evaluateGates(h, ctx, ctx.serverDate);
        let state: string = buttonState(h, ctx);
        let label = buttonLabel(h, ctx);
        let reason: string | null = verdict.allowed ? null : verdict.reason;
        let message: string | null = verdict.allowed ? null : verdict.message;

        /* Gate 5, folded in on exactly the same precedence the POST applies, so
           the button the board draws and the answer a tap gets cannot disagree.

           It overrides LIVE (nothing else refused this, but a prerequisite does)
           and out_of_order (the Order field expresses the same refusal, and
           journal_required is the reason worth recording). It deliberately does
           NOT override DONE, MISSED, or a window/dwell/cascade LOCKED: "Opens
           8:30am" is the more useful thing to say at 7am, and a habit already
           ticked is not waiting on anything. */
        const prereq = gatePrerequisite(h, richHabits, ctx);
        if (prereq && (state === "LIVE" || reason === "out_of_order")) {
          state = "LOCKED";
          label = prereq.message;
          reason = prereq.reason;
          message = prereq.message;
        }

        return {
          id: h.id,
          name: h.name,
          block: h.block,
          order: h.order,
          // The board needs this to keep a prerequisite out of the Today %
          // denominator and out of the perfect-day set. See lib/days.ts.
          pointType: h.pointType,
          window: h.windowStart && h.windowEnd ? `${h.windowStart}-${h.windowEnd}` : null,
          dwellSeconds: h.dwellSeconds,
          state,
          label,
          reason,
          message,
        };
      }),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "diagnostic failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/* ── POST — the gate ─────────────────────────────────────────────────────── */

export async function POST(request: Request) {
  const now = sydneyNow();                       // ← taken BEFORE any I/O
  const noStore = { "Cache-Control": "no-store" };

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request", message: "Invalid JSON" },
      { status: 400, headers: noStore });
  }

  // Exactly three fields are read. Anything else in the body — including a
  // `timestamp`, `completedAt` or `now` a client might hopefully attach — is
  // never assigned to anything and cannot influence the outcome.
  const habitId = typeof body.habitId === "string" ? body.habitId : "";
  const date = typeof body.date === "string" ? body.date : "";
  const overridePin = typeof body.overridePin === "string" ? body.overridePin : "";

  if (!habitId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { ok: false, reason: "bad_request", message: "habitId and date (YYYY-MM-DD) are required" },
      { status: 400, headers: noStore },
    );
  }

  /* THE ANTI-BATCHING CHECK, hoisted.
     gateWindow() checks this too, but it is worth refusing a wrong date before
     any habit lookup happens: a request naming yesterday is invalid whatever
     habit it names, and hoisting it means a stale tab queued overnight gets
     "Missed — that day is over" rather than a confusing 404 about a habit that
     exists perfectly well. Same reason strings either way. */
  const serverToday = now.date;
  if (date !== serverToday) {
    const reason = date < serverToday ? "closed" : "not_open";
    const message = date < serverToday ? "Missed — that day is over" : "That day hasn't started yet";
    // Logged against the SERVER's date, not the stale one the request carried —
    // the interesting fact is "a tap arrived today naming another day", and
    // filing it under the wrong day would hide it from the day it happened on.
    // ctx does not exist yet here (this check is hoisted above loadContext), so
    // the clock comes from `now`, which is the same instant ctx would carry.
    await logRejection({
      habitId, serverDate: serverToday, reason, detail: message,
      nowMinutes: now.minutesOfDay,
    });
    return NextResponse.json({
      ok: false,
      reason,
      message,
      serverDate: serverToday,
    }, { status: 409, headers: noStore });
  }

  let ctx: GateContext;
  let richHabits: Habit[];
  try {
    ({ ctx, habits: richHabits } = await loadContext(false));
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: "unavailable", message: err instanceof Error ? err.message : "load failed" },
      { status: 503, headers: noStore },
    );
  }

  // The rich row, not ctx.habits' narrowed view — gate 5 reads `pointType`.
  const habit = richHabits.find(h => h.id === habitId);
  if (!habit) {
    return NextResponse.json(
      { ok: false, reason: "unknown_habit", message: `No active habit "${habitId}" for ${ctx.serverDate}` },
      { status: 404, headers: noStore },
    );
  }

  /* ── Parent override (Stage 7) ─────────────────────────────────────────
     A correct PIN bypasses gates 1–4 and nothing else. The PIN lives only in
     the Netlify env var PARENT_OVERRIDE_PIN: it is never in Notion, never in
     the client bundle, and never echoed back in a response. */
  const expectedPin = process.env.PARENT_OVERRIDE_PIN;
  const attemptKey = clientKey(request);
  let overrideUsed = false;
  if (overridePin) {
    // Lockout is checked BEFORE the PIN is compared, so a locked-out caller
    // learns nothing about whether their guess was right.
    const { remainingMs: remaining } = await lockoutState(attemptKey, now.ms)
      .catch(() => ({ remainingMs: 0 }));
    if (remaining > 0) {
      return NextResponse.json({
        ok: false,
        reason: "locked_out",
        message: `Too many incorrect PINs. Try again in ${Math.ceil(remaining / 60000)} min.`,
        lockedMs: remaining,
      }, { status: 429, headers: noStore });
    }
    if (!expectedPin) {
      return NextResponse.json(
        { ok: false, reason: "no_override", message: "Parent override is not configured on this deploy." },
        { status: 503, headers: noStore },
      );
    }
    if (!timingSafeEqual(overridePin, expectedPin)) {
      await recordFailure(attemptKey, now.ms).catch(() => {});
      const after = await lockoutState(attemptKey, now.ms)
        .catch(() => ({ remainingMs: 0, failures: 0 }));
      const failures = after.failures;
      const nowLocked = after.remainingMs;
      return NextResponse.json({
        ok: false,
        reason: nowLocked > 0 ? "locked_out" : "bad_pin",
        message: nowLocked > 0
          ? `Too many incorrect PINs. Try again in ${Math.ceil(nowLocked / 60000)} min.`
          : "Incorrect PIN.",
        attemptsRemaining: Math.max(0, LOCKOUT_MAX_FAILURES - failures),
        lockedMs: nowLocked,
      }, { status: nowLocked > 0 ? 429 : 403, headers: noStore });
    }
    // A correct PIN clears the counter — the parent has proved themselves.
    await clearFailures(attemptKey).catch(() => {});
    overrideUsed = true;
  }

  if (!overrideUsed) {
    // The gauntlet's own verdict, recorded verbatim. `reason` is whichever of
    // not_open / closed / too_fast / out_of_order / locked gating.ts returned
    // — this route invents nothing and re-words nothing, so the ledger and the
    // response always agree about why a tap was refused.
    const verdict = evaluateGates(habit, ctx, date);
    let refusal: { reason: string; message: string } | null =
      verdict.allowed ? null : { reason: verdict.reason, message: verdict.message };

    /* Gate 5 outranks out_of_order and nothing else.
       If the prerequisite sits earlier in the block's Order — which is how it is
       configured in Notion — then gate 3 has already refused this tap as
       "out_of_order", with the same sentence. Both are true; only one is worth
       recording, because "journal_required" is the question the ledger will
       actually be asked. Window, dwell and cascade still win: "Opens 8:30am" is
       the more useful answer at 7am, whatever else is also unfinished. */
    const prereq = gatePrerequisite(habit, richHabits, ctx);
    if (prereq && (!refusal || refusal.reason === "out_of_order")) refusal = prereq;

    if (refusal) {
      await logRejection({
        habitId, serverDate: ctx.serverDate, reason: refusal.reason,
        detail: refusal.message, nowMinutes: ctx.nowMinutes,
      });
      return NextResponse.json(
        { ok: false, reason: refusal.reason, message: refusal.message, serverDate: ctx.serverDate },
        { status: 409, headers: noStore },
      );
    }
  }

  // The write-capability check sits HERE, deliberately after the gates rather
  // than before them. A refused tick must read as a refused tick — "Opens
  // 6:30am" — not as a server misconfiguration. Only a tick that has already
  // earned its write can be blocked by a missing key, and only then is
  // "not_configured" the honest answer.
  if (!hasServiceRole()) {
    return NextResponse.json({
      ok: false,
      reason: "not_configured",
      message: "Server cannot write: SUPABASE_SERVICE_ROLE_KEY is not set for this deploy.",
      gatesPassed: true,
    }, { status: 503, headers: noStore });
  }

  // The timestamp. Server clock, captured at the top of this handler, written
  // explicitly rather than left to the column default so there is exactly one
  // answer to "where did this time come from".
  const db = adminClient();
  const { error } = await db
    .from("habit_completions")
    .upsert(
      { habit_id: habitId, completed_date: ctx.serverDate, completed_at: new Date(now.ms).toISOString() },
      { onConflict: "habit_id,completed_date" },
    );

  if (error) {
    // PostgREST's hint names the role it actually resolved the request to
    // ("GRANT INSERT ... TO anon"), which is the difference between "the
    // service-role key is wrong" and "the grant was revoked". Both produce an
    // identical message, so the hint is the only thing that tells them apart.
    return NextResponse.json({
      ok: false,
      reason: "write_failed",
      message: error.message,
      hint: (error as { hint?: string }).hint ?? null,
      code: (error as { code?: string }).code ?? null,
    }, { status: 500, headers: noStore });
  }

  if (overrideUsed) {
    const reasonText = typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 500)
      : "Parent override — no reason given";
    const { error: logErr } = await db.from("override_log").insert({
      habit_id: habitId,
      date: ctx.serverDate,
      reason: reasonText,
      created_at: new Date(now.ms).toISOString(),
    });
    // A missing override_log table must not swallow a completion that already
    // landed. Surface it instead of failing the whole request.
    if (logErr) {
      return NextResponse.json({
        ok: true,
        override: true,
        warning: `Tick recorded, but override_log write failed: ${logErr.message}`,
        habitId,
        date: ctx.serverDate,
        completedAt: new Date(now.ms).toISOString(),
      }, { headers: noStore });
    }
  }

  return NextResponse.json({
    ok: true,
    override: overrideUsed,
    habitId,
    date: ctx.serverDate,
    // Echoed so a caller can see for itself that the stored time is the
    // server's, not whatever it may have sent.
    completedAt: new Date(now.ms).toISOString(),
    serverClock: `${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")} ${now.weekday} (Australia/Sydney)`,
  }, { headers: noStore });
}

/** Constant-time string compare, so a wrong PIN leaks nothing through timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
