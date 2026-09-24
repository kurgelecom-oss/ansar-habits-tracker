"use client";

/* One store for the pathway's ticks, personal bests and weekly focus.
   Server first (/api/pathway → Supabase pathway_log). If the server says
   storage is unavailable, everything is kept on this device instead and the
   page says so — it never claims a save it didn't make. */

import { useCallback, useEffect, useRef, useState } from "react";
import { BENCHMARKS } from "../data/scouts";
import type { MatchLog } from "../../lib/pathway";

export type Storage = "loading" | "supabase" | "local";
export interface PathwayState {
  storage: Storage;
  done: string[];
  pbs: Record<string, { value: number; date: string }>;
  focus: string | null;
  matches: MatchLog[];
}

const TZ_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" });
export const todayMelbourne = () => TZ_FMT.format(new Date());
export function weekStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const dow = t.getUTCDay();
  t.setUTCDate(t.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return t.toISOString().slice(0, 10);
}

const read = <T,>(key: string, fallback: T): T => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; } };
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };
const K = { ticks: (d: string) => `pathway-v1-ticks-${d}`, pbs: "pathway-v1-pbs", focus: (d: string) => `pathway-v1-focus-${weekStart(d)}`, matches: "pathway-v1-matches" };

function localState(date: string): PathwayState {
  return { storage: "local", done: read<string[]>(K.ticks(date), []), pbs: read(K.pbs, {}), focus: read<string | null>(K.focus(date), null), matches: read<MatchLog[]>(K.matches, []) };
}

export function usePathwayStore(date: string = todayMelbourne()) {
  const [state, setStateRaw] = useState<PathwayState>({ storage: "loading", done: [], pbs: {}, focus: null, matches: [] });
  // A ref mirror so handlers read the CURRENT state synchronously; React 18
  // may defer updater functions, so they can't be used to read state out.
  const ref = useRef(state);
  const setState = useCallback((next: PathwayState) => { ref.current = next; setStateRaw(next); }, []);

  useEffect(() => {
    let alive = true;
    fetch(`/api/pathway?date=${date}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => { if (!alive) return; setState(data.storage === "supabase" ? { storage: "supabase", done: data.done ?? [], pbs: data.pbs ?? {}, focus: data.focus ?? null, matches: data.matches ?? [] } : localState(date)); })
      .catch(() => { if (alive) setState(localState(date)); });
    return () => { alive = false; };
  }, [date, setState]);

  const post = useCallback(async (body: object): Promise<boolean> => {
    try {
      const r = await fetch("/api/pathway", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, date }) });
      return r.ok;
    } catch { return false; }
  }, [date]);

  /** Apply locally, then persist; a failed server write drops to on-device storage. */
  const commit = useCallback(async (next: PathwayState, body: object, saveLocal: () => void) => {
    const wasLocal = ref.current.storage === "local";
    setState(next);
    if (wasLocal) { saveLocal(); return; }
    if (!(await post(body))) { saveLocal(); setState({ ...ref.current, storage: "local" }); }
  }, [post, setState]);

  const toggle = useCallback((id: string) => {
    const s = ref.current;
    const done = s.done.includes(id) ? s.done.filter(x => x !== id) : [...s.done, id];
    return commit({ ...s, done }, { kind: "tick", itemId: id, done: done.includes(id) }, () => write(K.ticks(date), done));
  }, [commit, date]);

  const savePb = useCallback((id: string, value: number) => {
    const bench = BENCHMARKS.find(b => b.id === id);
    if (!bench || !Number.isFinite(value)) return;
    const s = ref.current;
    const prev = s.pbs[id];
    const better = !prev || (bench.better === "higher" ? value > prev.value : value < prev.value);
    const pbs = better ? { ...s.pbs, [id]: { value, date } } : s.pbs;
    return commit({ ...s, pbs }, { kind: "pb", itemId: id, value }, () => write(K.pbs, pbs));
  }, [commit, date]);

  const saveFocus = useCallback((note: string) => {
    const clean = note.trim().slice(0, 140);
    if (!clean) return;
    return commit({ ...ref.current, focus: clean }, { kind: "focus", note: clean }, () => write(K.focus(date), clean));
  }, [commit, date]);

  const saveMatch = useCallback((log: MatchLog) => {
    const s = ref.current;
    const matches = [log, ...s.matches.filter(m => m.day !== log.day)].sort((a, b) => b.day.localeCompare(a.day));
    return commit({ ...s, matches }, { kind: "match", ...log }, () => write(K.matches, matches));
  }, [commit]);

  return { state, toggle, savePb, saveFocus, saveMatch };
}
