import { NextResponse } from "next/server";
import { readSnapshotRange } from "../../lib/school-snapshot";
import { adminClient, hasServiceRole } from "../../lib/supabase-admin";
import { sydneyDateKey, sydneyNow, weekStartOf, addDays } from "../../lib/time";
import { checkPin } from "../../lib/pin-lockout";
import {
  zoneStates, zonesDone, isZoneId, PROOF_ZONES, TARGET_GATE_START, TARGET_ZONES_FOR_PS5, type ZoneId,
} from "../../lib/targets";

/* /api/targets — this week's Target Map.
     GET                                  zone states, logged proofs, PS5 rule 1b
     POST { zone, note }                  Ansar logs a proof (proof zones only)
     POST { zone, confirm: true, pin, note }  a parent confirms the note they read
   On a weekend this is the week just finished (weekStartOf is ISO), which is
   the week Saturday PS5 is judged on. */

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStore = { "Cache-Control": "no-store" };

type ProofRow = { zone: string; note: string; confirmed_at: string | null };

export async function GET() {
  const start = weekStartOf(sydneyDateKey());
  const end = addDays(start, 6);
  const base = { weekStart: start, configured: false, zones: null, proofs: {}, ps5Targets: null };
  if (!hasServiceRole()) return NextResponse.json(base, { headers: noStore });

  try {
    const db = adminClient();
    const [rows, ticks, blocksDone, proofRows] = await Promise.all([
      readSnapshotRange(start, addDays(start, 4)),
      db.from("habit_completions").select("habit_id, completed_date").gte("completed_date", start).lte("completed_date", end),
      db.from("school_block_completions").select("notion_row_id").gte("completed_date", start).lte("completed_date", end),
      db.from("target_proofs").select("zone, note, confirmed_at").eq("week_start", start),
    ]);
    const err = ticks.error ?? blocksDone.error ?? proofRows.error;
    if (err) throw new Error(err.message);

    const dates = new Map<string, Set<string>>();
    for (const t of ticks.data ?? []) dates.set(t.habit_id, (dates.get(t.habit_id) ?? new Set()).add(t.completed_date));
    const habitDays = Object.fromEntries([...dates].map(([id, d]) => [id, d.size]));
    // A block finished on Friday's catch-up still counts, so match on row id, not date.
    const done = new Set((blocksDone.data ?? []).map(b => b.notion_row_id));
    const blocks = rows.map(r => ({ label: r.label, task: r.task, done: done.has(r.notion_row_id) }));
    const proofs = Object.fromEntries(((proofRows.data ?? []) as ProofRow[])
      .filter(p => isZoneId(p.zone))
      .map(p => [p.zone, { note: p.note, confirmed: p.confirmed_at !== null }]));

    const zones = zoneStates({ habitDays, blocks, proofs });
    const ps5Targets = start >= TARGET_GATE_START ? { done: zonesDone(zones), need: TARGET_ZONES_FOR_PS5 } : null;
    return NextResponse.json({ weekStart: start, configured: true, zones, proofs, ps5Targets }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ ...base, message: (e as Error).message }, { headers: noStore });
  }
}

export async function POST(req: Request) {
  // Same-origin only: the board writes, nobody else does.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { zone?: unknown; note?: unknown; confirm?: unknown; pin?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400, headers: noStore }); }
  const zone = body.zone;
  if (!isZoneId(zone) || !PROOF_ZONES.includes(zone)) {
    return NextResponse.json({ error: "This zone is read from the board, not from a logged proof" }, { status: 400, headers: noStore });
  }
  if (!hasServiceRole()) return NextResponse.json({ error: "storage unavailable" }, { status: 503, headers: noStore });

  const now = sydneyNow();
  const week = weekStartOf(now.date);
  const db = adminClient();
  const existing = await db.from("target_proofs").select("id").eq("week_start", week).eq("zone", zone).maybeSingle();
  if (existing.error) return NextResponse.json({ error: "read failed" }, { status: 500, headers: noStore });

  if (body.confirm === true) {
    // Same key as /api/tick's clientKey, so every PIN entry point shares ONE
    // lockout tally rather than each granting its own five guesses.
    const ip = req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    const refusal = await checkPin(typeof body.pin === "string" ? body.pin : "", ip, now.ms, noStore);
    if (refusal) return refusal;
    // Confirm only the exact note the parent read, and only if still unconfirmed:
    // a note rewritten between reading and typing the PIN matches nothing.
    const seen = typeof body.note === "string" ? body.note.trim() : "";
    const { data, error } = await db.from("target_proofs").update({ confirmed_at: new Date().toISOString() })
      .eq("week_start", week).eq("zone", zone).eq("note", seen).is("confirmed_at", null).select("id");
    if (error) return NextResponse.json({ error: "write failed" }, { status: 500, headers: noStore });
    return data?.length ? NextResponse.json({ ok: true }, { headers: noStore })
      : NextResponse.json({ error: "The proof changed or was already confirmed. Reload and read it again." }, { status: 409, headers: noStore });
  }

  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length < 3 || note.length > 500) return NextResponse.json({ error: "Write 3 to 500 characters about what you did" }, { status: 400, headers: noStore });
  // A confirmed proof is the parent's word; Ansar cannot rewrite it afterwards.
  // Conditional on confirmed_at IS NULL so a confirm landing mid-request is never undone.
  const write = existing.data
    ? await db.from("target_proofs").update({ note, logged_at: new Date().toISOString() })
        .eq("week_start", week).eq("zone", zone).is("confirmed_at", null).select("id")
    : await db.from("target_proofs").insert({ week_start: week, zone: zone as ZoneId, note }).select("id");
  if (write.error) return NextResponse.json({ error: "write failed" }, { status: write.error.code === "23505" ? 409 : 500, headers: noStore });
  return write.data?.length ? NextResponse.json({ ok: true }, { headers: noStore })
    : NextResponse.json({ error: "Already confirmed by a parent" }, { status: 409, headers: noStore });
}
