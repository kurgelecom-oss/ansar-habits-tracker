"use client";
import { useCallback, useEffect, useState } from "react";

export type PaperLock = { locked: false } | { locked: true; due: { id: string; kind: string; title: string }[]; message: string };

/**
 * Is a Friday review or today's exam due and not handed in? Read from the
 * server (lib/assessments/gate.ts), which also refuses the ticks themselves.
 * Re-reads when he comes back from Tests, so the lock lifts by itself.
 * An unreachable server leaves `lock` null: the screen stays open, never trapped.
 */
export function usePaperLock() {
  const [lock, setLock] = useState<PaperLock | null>(null);
  const reload = useCallback(() => {
    fetch("/api/assessments/gate", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setLock({ locked: !!d.locked, due: d.due ?? [], message: d.message ?? "" } as PaperLock))
      .catch(() => { /* say nothing rather than claim a lock */ });
  }, []);
  useEffect(() => {
    reload();
    const onShow = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", reload);
    const poll = setInterval(reload, 60_000);
    return () => { document.removeEventListener("visibilitychange", onShow); window.removeEventListener("focus", reload); clearInterval(poll); };
  }, [reload]);
  return { lock, reload };
}
