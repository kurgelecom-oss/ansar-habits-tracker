/* ════════════════════════════════════════════════════════════════════════════
   /api/golden-boot — the finalised-week ledger, server-authoritative.

     GET                      read-only state. Anon key, RLS-open SELECT.
     POST { pin, dryRun? }    finalise closed weeks + reconcile awards.
                              PARENT_OVERRIDE_PIN required. Service-role writes.

   WHY THE WRITE LIVES HERE AND NOWHERE ELSE. week_results is the record the
   Golden Boot is counted off. A child who can write it can award himself the
   prize, which is why db/week_results.sql grants anon SELECT and nothing else,
   and why the only key that can write it is the service role — held by this
   route and never by the browser. app/lib/goldenBoot.ts takes its client as an
   argument precisely so this file is the only place a privileged client is
   constructed.

   The POST is GUARDED BY THE PARENT PIN, reusing the machinery /api/tick uses
   for overrides: constant-time compare plus app/lib/pin-lockout.ts for
   brute-force lockout. Finalising is idempotent and derives everything from
   habit_completions — it cannot invent a week — but it is still a write to a
   permanent record, and permanent records get a parent's hand on them.

   NO CRON. Nothing calls this on a schedule; there is no scheduler in this
   deploy. A week is finalised the next time someone POSTs, which is why the
   routine finalises EVERY overdue week rather than only last week — miss three
   weeks and the next call still catches all three up.

   NOTE ON EXPORTS: a Next.js route module may only export the handler names and
   a fixed set of config fields. Anything else fails the build with "<NAME> is
   not a valid Route export field" — helpers stay unexported, and shared logic
   lives in app/lib/goldenBoot.ts.
   ══════════════════════════════════════════════════════════════════════════ */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sydneyNow } from "../../lib/time";
import { getHabits } from "../../lib/notion";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";
import {
  finalizeWeeks,
  loadWeekResults,
  loadAwards,
  trailingFirstTeamStreak,
  GOLDEN_BOOT_TARGET,
  type RosterHabit,
} from "../../lib/goldenBoot";
import {
  lockoutState, recordFailure, clearFailures, LOCKOUT_MAX_FAILURES,
} from "../../lib/pin-lockout";

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

/* Same shape as /api/tick's. A per-instance Map would not survive Netlify
   spreading requests across warm Lambdas, which is why lockout state lives in
   Postgres and this only produces the key. */
function clientKey(request: Request): string {
  const h = request.headers;
  return (
    h.get("x-nf-client-connection-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

/** Constant-time string compare, so a wrong PIN leaks nothing through timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The habit roster, reduced to what week scoring needs.
 *
 * Notion is the source, as everywhere else. Note this is the roster as it stands
 * TODAY, which is the known limitation of recomputing history: a week finalised
 * now is scored against today's habit list. That is exactly why a week is
 * written down once and never restated — see the header of lib/goldenBoot.ts.
 */
async function loadRoster(): Promise<RosterHabit[]> {
  const habits = await getHabits();
  // pointType rides along so computeWeek() can drop unlock-only prerequisites
  // from preIds/baseIds — without it a prerequisite would silently become a
  // Perfect Day requirement in the permanent ledger. See lib/days.ts.
  return habits.map(h => ({ id: h.id, block: h.block, days: h.days, pointType: h.pointType }));
}

/* ── GET — state ─────────────────────────────────────────────────────────── */

export async function GET() {
  const now = sydneyNow();
  try {
    const db = readClient();
    const [weeks, awards] = await Promise.all([loadWeekResults(db), loadAwards(db)]);
    const streak = trailingFirstTeamStreak(weeks);
    return NextResponse.json({
      ok: true,
      serverDate: now.date,
      weekday: now.weekday,
      timeZone: "Australia/Sydney",
      target: GOLDEN_BOOT_TARGET,
      streak,
      // Position within the CURRENT run of four, which is what "X / 4" means on
      // a scoreboard. A streak of 4 reads 4/4 rather than 0/4; a streak of 5
      // reads 1/4 because a new run has started. Computed here rather than in a
      // component so two surfaces cannot disagree about it later.
      progress: streak > 0 && streak % GOLDEN_BOOT_TARGET === 0
        ? GOLDEN_BOOT_TARGET
        : streak % GOLDEN_BOOT_TARGET,
      weeks,
      awards,
      writeConfigured: hasServiceRole() && Boolean(process.env.PARENT_OVERRIDE_PIN),
    }, { headers: noStore });
  } catch (e) {
    // A missing table reads as "not set up yet" rather than a 500 —
    // db/week_results.sql is run by hand, so the window between deploy and
    // migration is a real state the board will briefly see.
    return NextResponse.json({
      ok: false,
      reason: "unavailable",
      message: e instanceof Error ? e.message : "week_results unavailable",
      serverDate: now.date,
    }, { status: 503, headers: noStore });
  }
}

/* ── POST — finalise ─────────────────────────────────────────────────────── */

export async function POST(request: Request) {
  const now = sydneyNow();

  let body: { pin?: unknown; dryRun?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request", message: "Invalid JSON" },
      { status: 400, headers: noStore });
  }
  const pin = typeof body.pin === "string" ? body.pin : "";
  const dryRun = body.dryRun === true;

  const expectedPin = process.env.PARENT_OVERRIDE_PIN;
  if (!expectedPin) {
    return NextResponse.json({
      ok: false, reason: "not_configured",
      message: "PARENT_OVERRIDE_PIN is not set for this deploy",
    }, { status: 503, headers: noStore });
  }
  if (!hasServiceRole()) {
    return NextResponse.json({
      ok: false, reason: "not_configured",
      message: "SUPABASE_SERVICE_ROLE_KEY is not set for this deploy",
    }, { status: 503, headers: noStore });
  }

  // Lockout BEFORE the compare, so a brute-force attempt is refused without ever
  // reaching the comparison.
  const attemptKey = `goldenboot:${clientKey(request)}`;
  const { remainingMs } = await lockoutState(attemptKey, now.ms)
    .catch(() => ({ remainingMs: 0, failures: 0 }));
  if (remainingMs > 0) {
    return NextResponse.json({
      ok: false, reason: "locked_out",
      message: `Too many wrong PINs — try again in ${Math.ceil(remainingMs / 60000)} min`,
    }, { status: 429, headers: noStore });
  }

  if (!timingSafeEqual(pin, expectedPin)) {
    await recordFailure(attemptKey, now.ms).catch(() => {});
    const after = await lockoutState(attemptKey, now.ms)
      .catch(() => ({ remainingMs: 0, failures: 0 }));
    return NextResponse.json({
      ok: false, reason: "bad_pin", message: "Wrong PIN",
      attemptsRemaining: Math.max(0, LOCKOUT_MAX_FAILURES - after.failures),
    }, { status: 403, headers: noStore });
  }
  await clearFailures(attemptKey).catch(() => {});

  try {
    const roster = await loadRoster();
    if (roster.length === 0) {
      // Fail closed. An empty roster scores every week as zero and would write
      // those zeros down permanently — the one mistake this table cannot undo.
      return NextResponse.json({
        ok: false, reason: "no_roster",
        message: "Notion returned no habits — refusing to finalise against an empty roster",
      }, { status: 503, headers: noStore });
    }

    const report = await finalizeWeeks(adminClient(), roster, now.date, dryRun);
    return NextResponse.json({ ok: true, dryRun, ...report }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({
      ok: false, reason: "failed",
      message: e instanceof Error ? e.message : "finalize failed",
    }, { status: 500, headers: noStore });
  }
}
