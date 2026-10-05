"use client";
import { useEffect, useState } from "react";
import { noticesFor } from "../../lib/notices";
import { sydneyDateKey } from "../../lib/time";
import styles from "./dashboard.module.css";

/**
 * One quiet line under the navigation: what Ansar, Mum and Dad each need to do
 * today, this week and this month, one notice at a time. Everyone reads the
 * same iPad, so each notice names who it is for.
 *
 * It advances every eight seconds, and holds still while it is pressed,
 * hovered or focused. With reduced motion it only moves when tapped.
 */
export default function Noticeboard() {
  // Empty until mounted: the page is prerendered at build time, and the build
  // day's notices must not be hydrated as today's.
  const [date, setDate] = useState("");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setDate(sydneyDateKey());
    if (paused || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // The date is re-read on each turn so a board left open overnight rolls over.
    const timer = setInterval(() => { setDate(sydneyDateKey()); setIndex(i => i + 1); }, 8000);
    return () => clearInterval(timer);
  }, [paused]);

  const notices = date ? noticesFor(date) : [];
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
    </div>
  );
}
