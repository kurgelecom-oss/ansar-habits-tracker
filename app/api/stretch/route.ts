/* ════════════════════════════════════════════════════════════════════════════
   /api/stretch — the Stretch Wallet, server-authoritative.

   THE MODEL CHANGED AGAIN HERE (tk, 5 Sep 2026), and it got simpler:

     • MON–FRI ONLY.  gateWallet() refuses a weekend outright. The weekend runs
                      on the tier + Saturday Push rules in lib/weekend.ts, and
                      Sunday is switched off. The wallet is not rendered there.
     • A DAILY SWITCH. Every active stretch item earned today = the day's reward,
                      "1h 15m PS5 today". Nothing is banked, nothing converts,
                      nothing is capped, and no minutes are counted — nobody was
                      tracking them, so the arithmetic was a fiction the board
                      kept telling with a straight face.
     • EARN ONLY.     `action: "spend"` is gone. `stretch_completions` stays as
                      the completion record (one row per item per day) and its
                      signed `minutes` column is written as 0 and read by nothing.

   What is still enforced, and where: the cascade (Qur'an → Morning → Homeschool)
   in gateWallet(); one earn per item per day, here, against the server's Sydney
   clock; and the item roster, from Notion (`getStretchItems`), fail-closed — an
   unreadable roster can never read as "all done".
   ══════════════════════════════════════════════════════════════════════════ */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sydneyNow } from "../../lib/time";
import { gateWallet, type GateContext, type GateCompletion } from "../../lib/gating";
import { getHabits, getSettings, getStretchItems, habitsForDay, SETTINGS_FALLBACK } from "../../lib/notion";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// NOT exported. A Next.js route module may only export the handler names and a
// fixed set of config fields; any other export fails the build.
/** What a complete wallet day is worth. A label, on purpose — nobody counts minutes. */
const DAILY_REWARD_LABEL = "1h 15m PS5 today";
/** Legacy conversion rows. Never written any more; filtered out when reading. */
const SPEND_ITEM_ID = "__spend__";

const noStore = { "Cache-Control": "no-store" };

function readClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Ids of every item earned on `date`. One query, one day. */
async function earnedToday(date: string): Promise<Set<string>> {
  const { data } = await readClient()
    .from("stretch_completions")
    .select("item_id")
    .eq("completed_date", date);
  return new Set(
    ((data ?? []) as { item_id: string }[])
      .map(r => r.item_id)
      .filter(id => id !== SPEND_ITEM_ID),
  );
}

/**
 * The active roster, fail-closed: a Notion failure reads as an empty list, and
 * an empty list can never be "complete" — `itemsTotal > 0` is required below,
 * or four earned items against an unreadable list would count as all of them.
 */
async function roster(): Promise<{ id: string }[]> {
  try {
    return await getStretchItems();
  } catch {
    return [];
  }
}

async function loadGateContext(date: string, weekday: string, nowMinutes: number, nowMs: number): Promise<GateContext> {
  let habitsLoaded = true;
  const [habitsAll, settings] = await Promise.all([
    getHabits().catch(() => {
      habitsLoaded = false;
      return [] as Awaited<ReturnType<typeof getHabits>>;
    }),
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
    habitsLoaded,
  };
}

/* ── GET — wallet state ──────────────────────────────────────────────────── */

export async function GET() {
  const now = sydneyNow();
  const [earned, ctx, items] = await Promise.all([
    earnedToday(now.date),
    loadGateContext(now.date, now.weekday, now.minutesOfDay, now.ms),
    roster(),
  ]);
  const unlock = gateWallet(ctx);
  const itemsDone = items.filter(i => earned.has(i.id)).length;
  const itemsTotal = items.length;
  const complete = itemsTotal > 0 && itemsDone === itemsTotal;

  return NextResponse.json({
    ok: true,
    serverDate: now.date,
    weekday: now.weekday,
    timeZone: "Australia/Sydney",
    /* false on Sat/Sun: the board hides the panel rather than showing it locked. */
    available: unlock.allowed || unlock.reason !== "closed",
    unlocked: unlock.allowed,
    lockMessage: unlock.allowed ? null : unlock.message,
    earnedItemIds: Array.from(earned),
    itemsDone,
    itemsTotal,
    complete,
    rewardLabel: DAILY_REWARD_LABEL,
  }, { headers: noStore });
}

/* ── POST — earn ─────────────────────────────────────────────────────────── */

export async function POST(request: Request) {
  const now = sydneyNow();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request", message: "Invalid JSON" },
      { status: 400, headers: noStore });
  }

  if (body.action !== "earn") {
    // "spend" included. A client still asking to convert minutes is running an
    // old board; it gets told the model changed, not a silent no-op.
    return NextResponse.json({ ok: false, reason: "bad_request", message: "action must be earn — minutes are no longer converted" },
      { status: 400, headers: noStore });
  }
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  if (!itemId || itemId === SPEND_ITEM_ID) {
    return NextResponse.json({ ok: false, reason: "bad_request", message: "itemId required" },
      { status: 400, headers: noStore });
  }

  const [ctx, earned, items] = await Promise.all([
    loadGateContext(now.date, now.weekday, now.minutesOfDay, now.ms),
    earnedToday(now.date),
    roster(),
  ]);

  // Cascade first — and on a weekend this is where the request stops.
  const unlock = gateWallet(ctx);
  if (!unlock.allowed) {
    return NextResponse.json({ ok: false, reason: unlock.reason, message: unlock.message },
      { status: 409, headers: noStore });
  }
  // Only a real item earns. An id that is not on the roster is refused rather
  // than recorded — otherwise a stray POST could pad the completion table.
  if (!items.some(i => i.id === itemId)) {
    return NextResponse.json({ ok: false, reason: "bad_request", message: "Unknown stretch item" },
      { status: 400, headers: noStore });
  }
  if (earned.has(itemId)) {
    return NextResponse.json({ ok: false, reason: "closed", message: "Already done today" },
      { status: 409, headers: noStore });
  }
  /* Every rule has now been checked. Only a request that has earned its write
     can be stopped by a missing key — same ordering rule as /api/tick. */
  if (!hasServiceRole()) {
    return NextResponse.json({
      ok: false, reason: "not_configured",
      message: "Server cannot write: SUPABASE_SERVICE_ROLE_KEY is not set for this deploy.",
      gatesPassed: true,
    }, { status: 503, headers: noStore });
  }

  const { error } = await adminClient().from("stretch_completions").insert({
    item_id: itemId,
    completed_date: now.date,
    minutes: 0,   // nobody tracks minutes; the row is the record
    created_at: new Date(now.ms).toISOString(),
  });
  if (error) {
    return NextResponse.json({ ok: false, reason: "write_failed", message: error.message },
      { status: 500, headers: noStore });
  }
  const itemsDone = items.filter(i => earned.has(i.id) || i.id === itemId).length;
  return NextResponse.json({
    ok: true, action: "earn", itemId,
    itemsDone, itemsTotal: items.length,
    complete: items.length > 0 && itemsDone === items.length,
    rewardLabel: DAILY_REWARD_LABEL,
  }, { headers: noStore });
}
