/* ════════════════════════════════════════════════════════════════════════════
   /api/stretch — the Stretch Wallet, server-authoritative.

   THE MODEL CHANGED HERE. It used to be a per-day wallet: earn minutes today,
   spend them today, balance resets at midnight. It is now a WEEKLY BANK with a
   WEEKEND-ONLY TILL:

     • EARN   — any day, any time the wallet cascade is open. Points bank.
                Uncapped at earn time; banking all week is the point.
     • SPEND  — Saturday and Sunday only, checked against Australia/Sydney on
                THIS server, and capped at 75 redeemed minutes per day.

   The ledger table is unchanged (`stretch_completions`, signed `minutes`), so
   nothing already recorded needs migrating. What changed is the balance window:
   it is now summed Monday→Sunday rather than for a single date.

   1 point = 10 minutes. Qur'an's daily minimum is NOT in here: it earns nothing
   and only unlocks — see gateWallet() in lib/gating.ts.
   ══════════════════════════════════════════════════════════════════════════ */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sydneyNow, isSydneyWeekend, weekStartOf, addDays } from "../../lib/time";
import { gateWallet, type GateContext, type GateCompletion } from "../../lib/gating";
import { getHabits, getSettings, habitsForDay, SETTINGS_FALLBACK } from "../../lib/notion";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// NOT exported. A Next.js route module may only export the handler names and a
// fixed set of config fields; any other export fails the build with
// "<NAME> is not a valid Route export field".
const MIN_PER_POINT = 10;
const DAILY_REDEEM_CAP_MIN = 75;
const SPEND_ITEM_ID = "__spend__";
const SPEND_STEP_MIN = 10;

const noStore = { "Cache-Control": "no-store" };

function readClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

interface LedgerRow { item_id: string; minutes: number; completed_date: string }

async function loadWallet(date: string) {
  const weekStart = weekStartOf(date);
  const weekEnd = addDays(weekStart, 6);
  const { data } = await readClient()
    .from("stretch_completions")
    .select("item_id, minutes, completed_date")
    .gte("completed_date", weekStart)
    .lte("completed_date", weekEnd);
  const rows = (data ?? []) as LedgerRow[];

  const earnedWeek = rows
    .filter(r => r.item_id !== SPEND_ITEM_ID && r.minutes > 0)
    .reduce((s, r) => s + r.minutes, 0);
  const spentWeek = rows
    .filter(r => r.item_id === SPEND_ITEM_ID)
    .reduce((s, r) => s + Math.abs(r.minutes), 0);
  const spentToday = rows
    .filter(r => r.item_id === SPEND_ITEM_ID && r.completed_date === date)
    .reduce((s, r) => s + Math.abs(r.minutes), 0);

  return {
    weekStart,
    weekEnd,
    rows,
    earnedWeek,
    spentWeek,
    spentToday,
    balance: Math.max(0, earnedWeek - spentWeek),
    remainingToday: Math.max(0, DAILY_REDEEM_CAP_MIN - spentToday),
  };
}

async function loadGateContext(date: string, weekday: string, nowMinutes: number, nowMs: number): Promise<GateContext> {
  const [habitsAll, settings] = await Promise.all([
    getHabits().catch(() => [] as Awaited<ReturnType<typeof getHabits>>),
    getSettings().catch(() => SETTINGS_FALLBACK),
  ]);
  const { data } = await readClient()
    .from("habit_completions")
    .select("habit_id, completed_at")
    .eq("completed_date", date);
  return {
    habits: habitsForDay(habitsAll, weekday),
    completions: (data ?? []) as GateCompletion[],
    serverDate: date,
    nowMinutes,
    nowMs,
    defaultDwellSeconds: settings.defaultDwellSeconds,
  };
}

/* ── GET — wallet state ──────────────────────────────────────────────────── */

export async function GET() {
  const now = sydneyNow();
  const [wallet, ctx, settings] = await Promise.all([
    loadWallet(now.date),
    loadGateContext(now.date, now.weekday, now.minutesOfDay, now.ms),
    getSettings().catch(() => SETTINGS_FALLBACK),
  ]);
  const unlock = gateWallet(ctx);
  const weekendOnly = settings.weekendRedemptionOnly;
  const isWeekend = isSydneyWeekend();

  return NextResponse.json({
    ok: true,
    serverDate: now.date,
    weekday: now.weekday,
    timeZone: "Australia/Sydney",
    weekStart: wallet.weekStart,
    balance: wallet.balance,
    earnedWeek: wallet.earnedWeek,
    spentWeek: wallet.spentWeek,
    spentToday: wallet.spentToday,
    remainingToday: wallet.remainingToday,
    dailyRedeemCapMin: DAILY_REDEEM_CAP_MIN,
    minPerPoint: MIN_PER_POINT,
    earnedItemIds: Array.from(new Set(
      wallet.rows.filter(r => r.item_id !== SPEND_ITEM_ID && r.completed_date === now.date)
        .map(r => r.item_id),
    )),
    unlocked: unlock.allowed,
    lockMessage: unlock.allowed ? null : unlock.message,
    weekendRedemptionOnly: weekendOnly,
    redemptionOpen: unlock.allowed && (!weekendOnly || isWeekend) && wallet.balance > 0 && wallet.remainingToday > 0,
    redemptionMessage: !unlock.allowed
      ? unlock.message
      : weekendOnly && !isWeekend
        ? "PS5 minutes unlock Saturday and Sunday — keep banking"
        : wallet.balance <= 0
          ? "Nothing banked yet"
          : wallet.remainingToday <= 0
            ? `Daily cap reached — ${DAILY_REDEEM_CAP_MIN} min redeemed today`
            : null,
  }, { headers: noStore });
}

/* ── POST — earn / spend ─────────────────────────────────────────────────── */

export async function POST(request: Request) {
  const now = sydneyNow();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request", message: "Invalid JSON" },
      { status: 400, headers: noStore });
  }

  const action = body.action === "spend" ? "spend" : body.action === "earn" ? "earn" : "";
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const points = typeof body.points === "number" ? body.points : 0;
  if (!action) {
    return NextResponse.json({ ok: false, reason: "bad_request", message: "action must be earn or spend" },
      { status: 400, headers: noStore });
  }

  const [ctx, settings, wallet] = await Promise.all([
    loadGateContext(now.date, now.weekday, now.minutesOfDay, now.ms),
    getSettings().catch(() => SETTINGS_FALLBACK),
    loadWallet(now.date),
  ]);

  // Cascade first, both ways: nothing is earned or redeemed until Morning
  // Habits and Homeschool are both 100%.
  const unlock = gateWallet(ctx);
  if (!unlock.allowed) {
    return NextResponse.json({ ok: false, reason: unlock.reason, message: unlock.message },
      { status: 409, headers: noStore });
  }

  /** Every rule has now been checked. Only a request that has earned its write
      can be stopped by a missing key — same ordering rule as /api/tick, so a
      refusal always reads as a refusal rather than as a broken server. */
  function requireWriter() {
    return hasServiceRole() ? null : NextResponse.json({
      ok: false, reason: "not_configured",
      message: "Server cannot write: SUPABASE_SERVICE_ROLE_KEY is not set for this deploy.",
      gatesPassed: true,
    }, { status: 503, headers: noStore });
  }

  if (action === "earn") {
    if (!itemId || itemId === SPEND_ITEM_ID) {
      return NextResponse.json({ ok: false, reason: "bad_request", message: "itemId required" },
        { status: 400, headers: noStore });
    }
    // One earn per item per calendar day.
    const already = wallet.rows.some(r => r.item_id === itemId && r.completed_date === now.date);
    if (already) {
      return NextResponse.json({ ok: false, reason: "closed", message: "Already earned today" },
        { status: 409, headers: noStore });
    }
    const blocked = requireWriter();
    if (blocked) return blocked;

    const minutes = Math.max(0, Math.round(points)) * MIN_PER_POINT;
    const { error } = await adminClient().from("stretch_completions").insert({
      item_id: itemId,
      completed_date: now.date,
      minutes,
      created_at: new Date(now.ms).toISOString(),
    });
    if (error) {
      return NextResponse.json({ ok: false, reason: "write_failed", message: error.message },
        { status: 500, headers: noStore });
    }
    return NextResponse.json({ ok: true, action: "earn", itemId, minutes, balance: wallet.balance + minutes },
      { headers: noStore });
  }

  /* SPEND — the weekend till. */
  if (settings.weekendRedemptionOnly && !isSydneyWeekend()) {
    return NextResponse.json({
      ok: false,
      reason: "closed",
      message: `PS5 minutes convert on Saturday and Sunday only — today is ${now.weekday} in Sydney`,
    }, { status: 409, headers: noStore });
  }
  if (wallet.balance <= 0) {
    return NextResponse.json({ ok: false, reason: "closed", message: "Nothing banked to spend" },
      { status: 409, headers: noStore });
  }
  if (wallet.remainingToday <= 0) {
    return NextResponse.json({
      ok: false, reason: "closed",
      message: `Daily cap reached — ${DAILY_REDEEM_CAP_MIN} min already redeemed today`,
    }, { status: 409, headers: noStore });
  }

  const blockedSpend = requireWriter();
  if (blockedSpend) return blockedSpend;

  const burn = Math.min(SPEND_STEP_MIN, wallet.balance, wallet.remainingToday);
  const { error } = await adminClient().from("stretch_completions").insert({
    item_id: SPEND_ITEM_ID,
    completed_date: now.date,
    minutes: -burn,
    created_at: new Date(now.ms).toISOString(),
  });
  if (error) {
    return NextResponse.json({ ok: false, reason: "write_failed", message: error.message },
      { status: 500, headers: noStore });
  }
  return NextResponse.json({
    ok: true, action: "spend", minutes: burn,
    balance: wallet.balance - burn,
    remainingToday: wallet.remainingToday - burn,
  }, { headers: noStore });
}
