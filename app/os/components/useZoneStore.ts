"use client";

/* One zone OS's ticks, scores and weekly focus. Same rules as the Football
   Pathway's store: server first (/api/os/[zone] → zone_log); if the server
   says storage is unavailable, keep everything on this device and say so. */

import { useCallback, useEffect, useRef, useState } from "react";
import { todayMelbourne, weekStart } from "../../pathway/components/usePathwayStore";
import type { Benchmark } from "../data/types";

export type Storage = "loading" | "supabase" | "local";
export type ScoreRow = { item_id: string; value: number; log_date: string };
export interface ZoneState { storage: Storage; done: string[]; scores: ScoreRow[]; focus: string | null }

const read = <T,>(key: string, fallback: T): T => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; } };
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

/** Best logged score per benchmark, by that benchmark's direction. */
export function bestOf(b: Benchmark, rows: ScoreRow[]): ScoreRow | undefined {
  return rows.filter(r => r.item_id === b.id).reduce<ScoreRow | undefined>((best, r) =>
    !best || (b.better === "higher" ? Number(r.value) > Number(best.value) : Number(r.value) < Number(best.value)) ? r : best, undefined);
}

export function tierFor(b: Benchmark, value: number | undefined): "gold" | "silver" | "bronze" | "starting" | null {
  if (value === undefined) return null;
  const beats = (t: number) => (b.better === "higher" ? value >= t : value <= t);
  return beats(b.gold) ? "gold" : beats(b.silver) ? "silver" : beats(b.bronze) ? "bronze" : "starting";
}

export function useZoneStore(zone: string, date: string = todayMelbourne()) {
  const K = { ticks: `os-${zone}-v1-ticks-${date}`, scores: `os-${zone}-v1-scores`, focus: `os-${zone}-v1-focus-${weekStart(date)}` };
  const local = (): ZoneState => ({ storage: "local", done: read<string[]>(K.ticks, []), scores: read<ScoreRow[]>(K.scores, []), focus: read<string | null>(K.focus, null) });

  const [state, setStateRaw] = useState<ZoneState>({ storage: "loading", done: [], scores: [], focus: null });
  const ref = useRef(state);
  const setState = useCallback((next: ZoneState) => { ref.current = next; setStateRaw(next); }, []);

  useEffect(() => {
    let alive = true;
    fetch(`/api/os/${zone}?date=${date}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (alive) setState(d.storage === "supabase" ? { storage: "supabase", done: d.done ?? [], scores: d.scores ?? [], focus: d.focus ?? null } : local()); })
      .catch(() => { if (alive) setState(local()); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, date, setState]);

  const commit = useCallback(async (next: ZoneState, body: object, saveLocal: () => void) => {
    const wasLocal = ref.current.storage === "local";
    setState(next);
    if (wasLocal) { saveLocal(); return; }
    const ok = await fetch(`/api/os/${zone}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, date }) }).then(r => r.ok).catch(() => false);
    if (!ok) { saveLocal(); setState({ ...ref.current, storage: "local" }); }
  }, [zone, date, setState]);

  const toggle = useCallback((id: string) => {
    const s = ref.current;
    const done = s.done.includes(id) ? s.done.filter(x => x !== id) : [...s.done, id];
    return commit({ ...s, done }, { kind: "tick", itemId: id, done: done.includes(id) }, () => write(K.ticks, done));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit]);

  const saveScore = useCallback((id: string, value: number) => {
    if (!Number.isFinite(value)) return;
    const s = ref.current;
    const scores = [{ item_id: id, value, log_date: date }, ...s.scores.filter(r => !(r.item_id === id && r.log_date === date))];
    return commit({ ...s, scores }, { kind: "pb", itemId: id, value }, () => write(K.scores, scores));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, date]);

  const saveFocus = useCallback((note: string) => {
    const clean = note.trim().slice(0, 140);
    if (!clean) return;
    return commit({ ...ref.current, focus: clean }, { kind: "focus", note: clean }, () => write(K.focus, clean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit]);

  return { state, toggle, saveScore, saveFocus };
}
