/* /api/pathway — the Football Pathway's read/write door.

   GET  → today's plan (from app/pathway/data/week.ts), the checklist, what is
          ticked, best scores and Mum's weekly focus. Nihal OS reads this
          cross-origin to show Ansar's football day on her control room.
   POST → one tick / personal best / weekly focus, written with the service
          role (pathway_log has RLS on and no anon policies).

   If the table is not created yet (db/pathway_log.sql) or the service role is
   missing, both verbs answer storage:"unavailable" and the page falls back to
   on-device storage. Nothing pretends to have saved. */

import { NextResponse } from "next/server";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";
import { addDays, dayNameOf, sydneyDateKey, weekStartOf } from "../../lib/time";
import { bestScores, isMissingTable, matchLogs, parseWrite, type PbRow } from "../../lib/pathway";
import { checklistFor, planFor } from "../../pathway/data/week";
import { SEASON, opponentOf, summarise } from "../../pathway/data/matches";

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = new Set([
  "https://nihal-os-control-room.netlify.app",
  "http://localhost:3000",
  "http://localhost:3001",
]);

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  return origin && ALLOWED_ORIGINS.has(origin)
    ? { "Access-Control-Allow-Origin": origin, Vary: "Origin", "Cache-Control": "no-store" }
    : { "Cache-Control": "no-store" };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: { ...cors(req), "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "content-type" } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const today = sydneyDateKey();
  const asked = url.searchParams.get("date");
  const date = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today;
  const weekday = dayNameOf(date);
  const plan = planFor(weekday);
  const checklist = checklistFor(plan);

  const base = {
    date, weekday,
    plan: { day: plan.day, theme: plan.theme, headline: plan.headline, fuel: plan.fuel, treatWindow: plan.treatWindow, lightsOut: plan.lightsOut, sessions: plan.sessions.map(s => ({ id: s.id, icon: s.icon, title: s.title, start: s.start, minutes: s.minutes, kind: s.kind })) },
    checklist: checklist.map(c => ({ id: c.id, label: c.label, icon: c.icon })),
    link: "https://ansar-habits-tracker.netlify.app/pathway",
    nextMatch: (() => { const n = summarise(SEASON.fixtures).next; return n ? { date: n.date, opponent: opponentOf(n), isHome: n.isHome, ground: n.ground, round: n.round } : null; })(),
  };

  if (!hasServiceRole()) return NextResponse.json({ ...base, storage: "unavailable", done: [], pbs: {}, focus: null, matches: [] }, { headers: cors(req) });

  const db = adminClient();
  const weekStart = weekStartOf(date);
  const [ticks, pbs, focus, matches] = await Promise.all([
    db.from("pathway_log").select("item_id").eq("kind", "tick").eq("log_date", date),
    db.from("pathway_log").select("item_id,value,log_date").eq("kind", "pb").order("log_date", { ascending: false }).limit(500),
    db.from("pathway_log").select("note,log_date").eq("kind", "focus").gte("log_date", weekStart).lte("log_date", addDays(weekStart, 6)).order("log_date", { ascending: false }).limit(1),
    db.from("pathway_log").select("note").eq("kind", "match").order("item_id", { ascending: false }).limit(100),
  ]);
  const err = ticks.error ?? pbs.error ?? focus.error ?? matches.error;
  if (err) {
    const storage = isMissingTable(err) ? "unavailable" : "error";
    return NextResponse.json({ ...base, storage, done: [], pbs: {}, focus: null, matches: [] }, { headers: cors(req) });
  }
  const valid = new Set(checklist.map(c => c.id));
  const done = (ticks.data ?? []).map(r => r.item_id as string).filter(id => valid.has(id));
  return NextResponse.json({
    ...base, storage: "supabase",
    done, doneCount: done.length, total: checklist.length,
    pbs: bestScores((pbs.data ?? []) as PbRow[]),
    focus: focus.data?.[0]?.note ?? null,
    matches: matchLogs(matches.data ?? []),
  }, { headers: cors(req) });
}

export async function POST(req: Request) {
  // Same-origin only: the board writes, nobody else does.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const write = parseWrite(body);
  if ("error" in write) return NextResponse.json(write, { status: 400 });
  if (!hasServiceRole()) return NextResponse.json({ storage: "unavailable" }, { status: 503 });

  const db = adminClient();
  const now = new Date().toISOString();
  let error;
  if (write.kind === "tick") {
    ({ error } = write.done
      ? await db.from("pathway_log").upsert({ log_date: write.date, kind: "tick", item_id: write.itemId, value: 1, updated_at: now }, { onConflict: "log_date,kind,item_id" })
      : await db.from("pathway_log").delete().eq("log_date", write.date).eq("kind", "tick").eq("item_id", write.itemId));
  } else if (write.kind === "pb") {
    ({ error } = await db.from("pathway_log").upsert({ log_date: write.date, kind: "pb", item_id: write.itemId, value: write.value, updated_at: now }, { onConflict: "log_date,kind,item_id" }));
  } else if (write.kind === "match") {
    ({ error } = await db.from("pathway_log").upsert({ log_date: write.itemId.slice(2), kind: "match", item_id: write.itemId, value: write.rating, note: write.note, updated_at: now }, { onConflict: "log_date,kind,item_id" }));
  } else {
    ({ error } = await db.from("pathway_log").upsert({ log_date: sydneyDateKey(), kind: "focus", item_id: "week", note: write.note, updated_at: now }, { onConflict: "log_date,kind,item_id" }));
  }
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ storage: "unavailable" }, { status: 503 });
    return NextResponse.json({ error: "write failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, storage: "supabase" });
}
