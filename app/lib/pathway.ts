/* Pure logic for /api/pathway — kept out of route.ts so it can be unit-tested
   (a route file may only export Next's route fields). */

import { addDays, sydneyDateKey } from "./time";
import { BENCHMARKS } from "../pathway/data/scouts";

export type PathwayWrite =
  | { kind: "tick"; itemId: string; done: boolean; date: string }
  | { kind: "pb"; itemId: string; value: number; date: string }
  | { kind: "focus"; note: string; date: string };

const ID_RE = /^[a-z0-9_:-]{1,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Ticks may land on today or yesterday (Sydney) — the same 1-day grace the journal gets. */
export function parseWrite(body: unknown, now: Date = new Date()): PathwayWrite | { error: string } {
  if (!body || typeof body !== "object") return { error: "body must be an object" };
  const b = body as Record<string, unknown>;
  const today = sydneyDateKey(now);
  const date = typeof b.date === "string" && DATE_RE.test(b.date) ? b.date : today;
  if (date !== today && date !== addDays(today, -1)) return { error: "date must be today or yesterday" };

  if (b.kind === "tick") {
    if (typeof b.itemId !== "string" || !ID_RE.test(b.itemId)) return { error: "bad itemId" };
    if (typeof b.done !== "boolean") return { error: "done must be boolean" };
    return { kind: "tick", itemId: b.itemId, done: b.done, date };
  }
  if (b.kind === "pb") {
    const bench = BENCHMARKS.find(x => x.id === b.itemId);
    if (!bench) return { error: "unknown benchmark" };
    const value = typeof b.value === "number" ? b.value : Number(b.value);
    if (!Number.isFinite(value) || value < 0 || value > 10000) return { error: "bad value" };
    return { kind: "pb", itemId: bench.id, value, date };
  }
  if (b.kind === "focus") {
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 140) : "";
    if (!note) return { error: "note required" };
    return { kind: "focus", note, date };
  }
  return { error: "unknown kind" };
}

export interface PbRow { item_id: string; value: number; log_date: string }

/** Best score per benchmark, honouring whether higher or lower is better. */
export function bestScores(rows: PbRow[]): Record<string, { value: number; date: string }> {
  const out: Record<string, { value: number; date: string }> = {};
  for (const row of rows) {
    const bench = BENCHMARKS.find(b => b.id === row.item_id);
    if (!bench) continue;
    const value = Number(row.value);
    const prev = out[row.item_id];
    const better = !prev || (bench.better === "higher" ? value > prev.value : value < prev.value);
    if (better) out[row.item_id] = { value, date: row.log_date };
  }
  return out;
}

/** Postgres "table missing" (42P01) or PostgREST "not in schema cache" (PGRST205). */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "");
}
