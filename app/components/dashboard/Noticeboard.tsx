"use client";
import { useEffect, useState } from "react";
import { noticesFor, openNotices, type NoticeState } from "../../lib/notices";
import { sydneyDateKey } from "../../lib/time";
import styles from "./dashboard.module.css";

/**
 * One quiet line under the navigation: what Ansar, Mum and Dad each need to do
 * today, this week and this month, one notice at a time. Everyone reads the
 * same MacBook, so each notice names who it is for.
 *
 * It advances every eight seconds, and holds still while it is pressed,
 * hovered or focused. With reduced motion it only moves when tapped.
 *
 * A notice goes away when it is done. Where the board can see that for itself
 * (Tests unlocked, exams approved, a paper handed in) it drops the notice
 * unasked; anything else has a tick that clears it for the day.
 */

// Ticks are kept per browser and per day. Known limit: nothing stops Ansar
// ticking off a notice meant for a parent.
const DONE_KEY = "ansar-notices-done-v1";
function readDone(date: string): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(DONE_KEY) ?? "null");
    return saved?.date === date && Array.isArray(saved.texts) ? saved.texts : [];
  } catch { return []; }
}
function writeDone(date: string, texts: string[]) {
  try { localStorage.setItem(DONE_KEY, JSON.stringify({ date, texts })); } catch { /* private window: the tick lasts until reload */ }
}

export default function Noticeboard() {
  // Empty until mounted: the page is prerendered at build time, and the build
  // day's notices must not be hydrated as today's.
  const [date, setDate] = useState("");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [state, setState] = useState<NoticeState>({ unlocked: false, facts: null, done: [] });

  useEffect(() => {
    setDate(sydneyDateKey());
    if (paused || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // The date is re-read on each turn so a board left open overnight rolls over.
    const timer = setInterval(() => { setDate(sydneyDateKey()); setIndex(i => i + 1); }, 8000);
    return () => clearInterval(timer);
  }, [paused]);

  // What is already done: asked once the date is known, and again whenever the
  // window comes back into view (he has usually just been in Tests).
  useEffect(() => {
    if (!date) return;
    let live = true;
    const load = () => fetch("/api/assessments/gate", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(j => { if (live) setState({ unlocked: j?.unlocked === true, facts: j?.facts ?? null, done: readDone(date) }); });
    load();
    window.addEventListener("focus", load);
    return () => { live = false; window.removeEventListener("focus", load); };
  }, [date]);

  const notices = date ? openNotices(noticesFor(date), state) : [];
  if (!notices.length) return null;
  const at = ((index % notices.length) + notices.length) % notices.length;
  const notice = notices[at];
  return (
    <div
      className={styles.noticeboard}
      role="group"
      aria-label="Noticeboard"
      data-testid="noticeboard"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <button type="button" className={styles.noticeStep} aria-label="Previous notice" onClick={() => setIndex(i => i - 1)}>‹</button>
      <p className={styles.noticeLine} aria-live="polite">
        <span key={at} className={styles.noticeText}><strong>{notice.who}</strong> · {notice.text}</span>
      </p>
      <button type="button" className={styles.noticeStep} aria-label="Next notice" onClick={() => setIndex(i => i + 1)}>›</button>
      {!notice.clears && (
        <button
          type="button" className={styles.noticeStep} aria-label="Done for today" title="Done for today"
          onClick={() => { const done = [...state.done, notice.text]; writeDone(date, done); setState(s => ({ ...s, done })); }}
        >✓</button>
      )}
    </div>
  );
}
