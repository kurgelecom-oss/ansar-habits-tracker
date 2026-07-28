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
import { getHabits, getSettings, habitsForDay, SETTINGS_FALLBACK } from "../../lib/notion";
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

async function loadContext(fresh: boolean): Promise<GateContext> {
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
    habits,
    completions: (data ?? []) as GateCompletion[],
    serverDate: now.date,
    nowMinutes: now.minutesOfDay,
    nowMs: now.ms,
    defaultDwellSeconds: settings.defaultDwellSeconds,
  };
}

/* ── GET — read-only diagnostic ──────────────────────────────────────────── */

export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  try {
    const now = sydneyNow();
    const ctx = await loadContext(fresh);

    let lock = { remainingMs: 0, failures: 0 };
    let lockBackend: string | null = null;
    if (hasServiceRole()) {
      lock = await lockoutState(clientKey(request), now.ms).catch(() => ({ remainingMs: 0, failures: 0 }));
      lockBackend = await lockoutBackend().catch(() => null);
    }

    let overridden: string[] = [];
    let overrideLogToday: unknown[] = [];
    if (hasServiceRole()) {
      const { data } = await adminClient()
        .from("override_log")
        .select("*")
        .eq("date", now.date);
      overrideLogToday = (data ?? []).filter((r: { habit_id: string }) => r.habit_id !== "__pin_attempt__");
      overridden = Array.from(new Set(
        (overrideLogToday as { habit_id: string }[]).map(r => r.habit_id)));
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
      habits: ctx.habits.map(h => {
        const verdict = evaluateGates(h, ctx, ctx.serverDate);
        return {
          id: h.id,
          name: h.name,
          block: h.block,
          order: h.order,
          window: h.windowStart && h.windowEnd ? `${h.windowStart}-${h.windowEnd}` : null,
          dwellSeconds: h.dwellSeconds,
          state: buttonState(h, ctx),
          label: buttonLabel(h, ctx),
          reason: verdict.allowed ? null : verdict.reason,
          message: verdict.allowed ? null : verdict.message,
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
    return NextResponse.json({
      ok: false,
      reason: date < serverToday ? "closed" : "not_open",
      message: date < serverToday ? "Missed — that day is over" : "That day hasn't started yet",
      serverDate: serverToday,
    }, { status: 409, headers: noStore });
  }

  let ctx: GateContext;
  try {
    ctx = await loadContext(false);
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: "unavailable", message: err instanceof Error ? err.message : "load failed" },
      { status: 503, headers: noStore },
    );
  }

  const habit = ctx.habits.find(h => h.id === habitId);
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
    const verdict = evaluateGates(habit, ctx, date);
    if (!verdict.allowed) {
      return NextResponse.json(
        { ok: false, reason: verdict.reason, message: verdict.message, serverDate: ctx.serverDate },
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
