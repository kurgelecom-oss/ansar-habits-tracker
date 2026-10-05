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
 * OFF UNLESS SOMEONE TURNS IT ON (tk, 5 Oct 2026). It never starts by itself.
 * Pressing the Guide switch turns it on for this device; while it is on, each
 * screen opens its own guide on arrival. "Finish" closes the guide for the
 * screen you are on and leaves the switch on. "Turn guide off", or pressing
 * the switch again, turns it off everywhere.
 *
 * Nothing here reads or writes the record. It only looks at the page.
 */
const STORE = "ansar-guide-v2";
const isOn = () => { try { return localStorage.getItem(STORE) === "on"; } catch { return false; } };
const setOn = (on: boolean) => { try { localStorage.setItem(STORE, on ? "on" : "off"); } catch { /* private mode */ } };

type Box = { top: number; left: number; width: number; height: number };

export default function GuideMode() {
  const pathname = usePathname();
  const steps = guideFor(pathname);
  /** The switch: is guide mode on for this device? */
  const [on, setOnState] = useState(false);
  /** Is the card showing on this screen right now? */
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const switchRef = useRef<HTMLButtonElement | null>(null);

  // Read the switch after mount: localStorage does not exist on the server.
  // A null pathname means there is no router (a test render), so stay shut.
  useEffect(() => {
    if (!pathname) return;
    const mode = isOn();
    setOnState(mode);
    setIndex(0);
    if (!mode || guideFor(pathname).length === 0) { setOpen(false); return; }
    // A short wait lets the screen's own data arrive, so the first spotlight
    // lands on a panel that exists rather than on an empty frame.
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, [pathname]);

  /** Close the card. `turnOff` also flips the switch off for the device. */
  const close = useCallback((turnOff = false) => {
    setOpen(false);
    setBox(null);
    if (turnOff) { setOn(false); setOnState(false); }
    switchRef.current?.focus();
  }, []);

  const toggle = () => {
    if (on) { close(true); return; }
    setOn(true); setOnState(true);
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
        className={`${styles.switch} ${on ? styles.switchOn : ""}`}
        aria-pressed={on}
        onClick={toggle}
        title={on ? "Turn the guide off" : "Explain this screen, one area at a time"}
      >
        <span className={styles.switchDot} aria-hidden="true" />
        Guide {on ? "on" : "off"}
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
