import { NextResponse } from "next/server";
import { adminClient, hasServiceRole } from "../../../lib/supabase-admin";
import { isMissingTable } from "../../../lib/pathway";

/* /api/os/[zone] — the memory of one Target Map zone OS (zone_log).
   Same contract as /api/pathway: GET ?date= returns that day's ticks, every
   logged score and the week's focus; POST writes one. Standalone — nothing on
   the board reads this. storage:"unavailable" tells the page to keep things
   on the device instead. */

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const ZONES = ["scholar", "languages", "quran", "digital", "outdoors", "combat", "chess"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ITEM = /^[a-z0-9_-]{1,60}$/;

function weekStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + (t.getUTCDay() === 0 ? -6 : 1 - t.getUTCDay()));
  return t.toISOString().slice(0, 10);
}
const addDays = (date: string, n: number) => { const t = new Date(`${date}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

export async function GET(req: Request, { params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params;
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!ZONES.includes(zone) || !DATE.test(date)) return NextResponse.json({ error: "bad request" }, { status: 400, headers: noStore });
  if (!hasServiceRole()) return NextResponse.json({ storage: "unavailable" }, { headers: noStore });

  const db = adminClient();
  const ws = weekStart(date);
  const [ticks, pbs, focus] = await Promise.all([
    db.from("zone_log").select("item_id").eq("zone", zone).eq("kind", "tick").eq("log_date", date),
    db.from("zone_log").select("item_id,value,log_date").eq("zone", zone).eq("kind", "pb").order("log_date", { ascending: false }).limit(500),
    db.from("zone_log").select("note").eq("zone", zone).eq("kind", "focus").gte("log_date", ws).lte("log_date", addDays(ws, 6)).order("log_date", { ascending: false }).limit(1),
  ]);
  const err = ticks.error ?? pbs.error ?? focus.error;
  if (err) return NextResponse.json({ storage: isMissingTable(err) ? "unavailable" : "error" }, { headers: noStore });
  return NextResponse.json({
    storage: "supabase",
    done: (ticks.data ?? []).map(r => r.item_id),
    scores: pbs.data ?? [],
    focus: focus.data?.[0]?.note ?? null,
  }, { headers: noStore });
}

export async function POST(req: Request, { params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params;
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let b: { kind?: unknown; itemId?: unknown; date?: unknown; done?: unknown; value?: unknown; note?: unknown };
  try { b = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const date = typeof b.date === "string" && DATE.test(b.date) ? b.date : null;
  if (!ZONES.includes(zone) || !date) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!hasServiceRole()) return NextResponse.json({ storage: "unavailable" }, { status: 503 });

  const db = adminClient();
  const now = new Date().toISOString();
  const row = (kind: string, item_id: string, extra: object) => ({ zone, log_date: date, kind, item_id, updated_at: now, ...extra });
  const onConflict = "zone,log_date,kind,item_id";
  let error;
  if (b.kind === "tick" && typeof b.itemId === "string" && ITEM.test(b.itemId)) {
    ({ error } = b.done === true
      ? await db.from("zone_log").upsert(row("tick", b.itemId, { value: 1 }), { onConflict })
      : await db.from("zone_log").delete().eq("zone", zone).eq("log_date", date).eq("kind", "tick").eq("item_id", b.itemId));
  } else if (b.kind === "pb" && typeof b.itemId === "string" && ITEM.test(b.itemId) && typeof b.value === "number" && Number.isFinite(b.value) && Math.abs(b.value) < 1e6) {
    ({ error } = await db.from("zone_log").upsert(row("pb", b.itemId, { value: b.value }), { onConflict }));
  } else if (b.kind === "focus" && typeof b.note === "string" && b.note.trim().length > 0) {
    ({ error } = await db.from("zone_log").upsert(row("focus", "week", { note: b.note.trim().slice(0, 140) }), { onConflict }));
  } else {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (error) return NextResponse.json({ error: "write failed" }, { status: isMissingTable(error) ? 503 : 500 });
  return NextResponse.json({ ok: true, storage: "supabase" });
}
