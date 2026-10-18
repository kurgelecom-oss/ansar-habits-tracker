"use client";
import { useCallback, useEffect, useState } from "react";
import type { PublicStory } from "../../lib/story";
import StoryFeature from "./StoryFeature";
import s from "./story.module.css";

type Due = { due: true; story: PublicStory; session: { activeSeconds: number; maxScroll: number; attempts: { score: number; total: number }[] } };
const MORNING_ENDS = 8 * 60 + 30;   // the Morning Habits window never locks
const sydneyMinutes = () => {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: "Australia/Sydney", hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).format(new Date()).split(":").map(Number);
  return h * 60 + m;
};

/**
 * Covers every page while this week's story is unread (lib/story.ts). Only
 * reports the lock: the server refuses the ticks whatever this shows.
 * An unreachable server shows nothing. A parent can lift it for today.
 */
export default function StoryGate() {
  const [due, setDue] = useState<Due | null>(null);
  const [now, setNow] = useState(sydneyMinutes());
  const load = useCallback(() => {
    fetch("/api/story", { cache: "no-store" }).then(r => r.json()).then(d => setDue(d.due ? d : null)).catch(() => {});
  }, []);
  useEffect(() => { load(); const t = setInterval(() => setNow(sydneyMinutes()), 60_000); return () => clearInterval(t); }, [load]);
  const showing = !!due && now >= MORNING_ENDS;
  useEffect(() => {
    if (!showing) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = before; };
  }, [showing]);

  const progress = useCallback((activeSeconds: number, scroll: number) => {
    const body = JSON.stringify({ action: "progress", activeSeconds, scroll });
    fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, []);
  const submit = useCallback(async (answers: Record<string, number>, reflection: string, activeSeconds: number, scroll: number) => {
    try {
      const r = await fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit", answers, reflection, activeSeconds, scroll }) });
      return await r.json();
    } catch { return { ok: false, message: "Could not reach the server. Try again." }; }
  }, []);

  if (!showing) return null;
  return (
    <>
      <StoryFeature story={due.story} initial={due.session} onProgress={progress} onSubmit={submit} onDone={() => setDue(null)} />
      <ParentLift onLifted={() => setDue(null)} />
    </>
  );
}

function ParentLift({ onLifted }: { onLifted: () => void }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  async function lift(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/assessments/gate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) }).then(x => x.json()).catch(() => ({ ok: false }));
    if (r.ok) onLifted(); else setMsg(r.message ?? "That did not work.");
  }
  return (
    <div className={s.parent}>
      {open ? (
        <form onSubmit={lift}>
          <label htmlFor="story-pin">Parent PIN</label>
          <input id="story-pin" type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} />
          <button type="submit">Lift for today</button> {msg}
        </form>
      ) : <button onClick={() => setOpen(true)}>Parent</button>}
    </div>
  );
}
