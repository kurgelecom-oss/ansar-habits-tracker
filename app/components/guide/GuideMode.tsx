"use client";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { guideFor } from "./steps";
import styles from "./guide.module.css";

/**
 * GUIDE MODE — a walk through whatever screen is open.
 *
 * It lights up one area at a time, dims the rest, and explains that area: what
 * it is, how it is tracked, how it is measured, who controls it, and what it
 * leads to. The words live in steps.ts.
 *
 * STARTS BY ITSELF ONCE PER SCREEN, PER DEVICE. The first time a screen is
 * opened on a device the guide runs. After that it stays out of the way until
 * someone presses the Guide switch. This is deliberate: the Today board has
 * timed windows, and a guide that covered it every morning would cost ticks.
 *
 * The switch is the on/off. Off means no guide ever starts by itself. Turning
 * it on starts the guide for the current screen straight away.
 *
 * Nothing here reads or writes the record. It only looks at the page.
 */
const STORE = "ansar-guide-v1";
type Saved = { off: boolean; seen: string[] };

function load(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? "null");
    return { off: v?.off === true, seen: Array.isArray(v?.seen) ? v.seen : [] };
  } catch { return { off: false, seen: [] }; }
}
function save(s: Saved) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* private mode */ } }

type Box = { top: number; left: number; width: number; height: number };

export default function GuideMode() {
  const pathname = usePathname();
  const steps = guideFor(pathname);
  const [off, setOff] = useState(false);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const switchRef = useRef<HTMLButtonElement | null>(null);

  // Decide after mount: localStorage does not exist on the server, and a
  // null pathname means there is no router (a test render), so stay shut.
  useEffect(() => {
    if (!pathname) return;
    const s = load();
    setOff(s.off);
    setIndex(0);
    // A short wait lets the screen's own data arrive, so the first spotlight
    // lands on a panel that exists rather than on an empty frame.
    const t = setTimeout(() => {
      if (!s.off && !s.seen.includes(pathname) && guideFor(pathname).length > 0) setOpen(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [pathname]);

  const close = useCallback((turnOff = false) => {
    setOpen(false);
    setBox(null);
    const s = load();
    const seen = pathname && !s.seen.includes(pathname) ? [...s.seen, pathname] : s.seen;
    save({ off: turnOff ? true : s.off, seen });
    if (turnOff) setOff(true);
    switchRef.current?.focus();
  }, [pathname]);

  const toggle = () => {
    if (open) { close(true); return; }
    if (off) { save({ off: false, seen: [] }); setOff(false); }
    setIndex(0);
    setOpen(true);
  };

  const step = open ? steps[index] : undefined;

  // Find the area, bring it into view, and keep the spotlight on it while the
  // page scrolls or resizes.
  useLayoutEffect(() => {
    if (!step) return;
    const el = document.querySelector<HTMLElement>(step.target);
    if (!el) { setBox(null); return; }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ block: "center", behavior: reduce ? "auto" : "smooth" });
    let frame = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const queue = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", queue, true);
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue, true);
      window.removeEventListener("resize", queue);
    };
  }, [step]);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setIndex(i => Math.min(i + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, close, steps.length]);

  if (steps.length === 0) return null;
  const last = index === steps.length - 1;
  // Keep the words off the thing they describe: the card takes the side of the
  // screen the lit area is not on, and on a phone the end it is not at.
  const onRight = box !== null && box.left + box.width / 2 > window.innerWidth / 2;
  const isLow = box !== null && box.top + box.height / 2 > window.innerHeight / 2;

  return (
    <>
      <button
        ref={switchRef}
        type="button"
        className={`${styles.switch} ${open ? styles.switchOn : ""}`}
        aria-pressed={open}
        onClick={toggle}
        title={open ? "Turn the guide off" : "Explain this screen, one area at a time"}
      >
        <span className={styles.switchDot} aria-hidden="true" />
        Guide {open ? "on" : "off"}
      </button>

      {step ? (
        <div className={styles.layer}>
          {/* The dim. With a target it is the spotlight's own shadow, so the
              lit area stays tappable-looking and crisp; without one it is a
              plain veil. Clicking the dim does nothing on purpose: a stray tap
              should not throw the reader out of the guide. */}
          {box ? (
            <div
              className={styles.spot}
              style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }}
            />
          ) : <div className={styles.veil} />}

          <div
            ref={cardRef}
            className={`${styles.card} ${onRight ? styles.cardLeft : ""} ${isLow ? styles.cardHigh : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            tabIndex={-1}
          >
            <p className={styles.count}>Step {index + 1} of {steps.length}</p>
            <h2 id="guide-title" className={styles.title}>{step.title}</h2>
            <dl className={styles.body}>
              <dt>What this is</dt><dd>{step.what}</dd>
              <dt>How it is tracked</dt><dd>{step.tracked}</dd>
              <dt>How it is measured</dt><dd>{step.measured}</dd>
              <dt>Who controls it</dt><dd>{step.controlled}</dd>
              <dt>What it leads to</dt><dd>{step.leadsTo}</dd>
            </dl>
            <div className={styles.actions}>
              <button type="button" className={styles.quiet} onClick={() => close(true)}>Turn guide off</button>
              <span className={styles.spacer} />
              <button type="button" className={styles.ghost} onClick={() => setIndex(i => i - 1)} disabled={index === 0}>Back</button>
              <button type="button" className={styles.next} onClick={() => (last ? close() : setIndex(i => i + 1))}>
                {last ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
