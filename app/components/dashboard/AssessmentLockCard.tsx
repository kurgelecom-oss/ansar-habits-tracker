"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./dashboard.module.css";

/**
 * Shown on Today while a Friday review or a monthly exam is due and not handed
 * in. It says what is due, takes him straight to it, and gives a parent one
 * way to lift the lock for the day.
 *
 * It only REPORTS the lock. The lock itself is enforced by the server on every
 * tick (lib/assessments/gate.ts), so hiding this card unlocks nothing.
 */
type Lock = { locked: false } | { locked: true; due: { id: string; kind: string; title: string }[]; message: string };

export default function AssessmentLockCard() {
  const [lock, setLock] = useState<Lock | null>(null);
  const [asking, setAsking] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/assessments/gate", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setLock(d as Lock))
      .catch(() => { /* unreachable: say nothing rather than claim a lock */ });
  }, []);

  // Re-read when he comes back from the Tests screen, so the card clears itself.
  useEffect(() => {
    load();
    const onShow = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", load);
    return () => { document.removeEventListener("visibilitychange", onShow); window.removeEventListener("focus", load); };
  }, [load]);

  if (!lock?.locked) return null;

  async function lift(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/assessments/gate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }),
      });
      const body = await r.json();
      if (!r.ok || !body.ok) setError(body.message ?? "That did not work.");
      else { setPin(""); setAsking(false); load(); }
    } catch { setError("Could not reach the server."); }
    finally { setBusy(false); }
  }

  return (
    <section className={styles.paperLock} aria-label="A paper is due" data-testid="paper-lock">
      <div className={styles.paperLockText}>
        <h2 className={styles.paperLockTitle}>Hand this in first</h2>
        <ul className={styles.paperLockList}>
          {lock.due.map(p => <li key={p.id}>{p.title}</li>)}
        </ul>
        <p className={styles.paperLockNote}>
          The morning habits are open. Everything after them is locked until {lock.due.length === 1 ? "this is" : "these are"} handed in.
        </p>
      </div>
      <div className={styles.paperLockActions}>
        <Link href="/tests" className={styles.paperLockGo}>Open Tests</Link>
        {asking ? (
          <form onSubmit={lift} className={styles.paperLockForm}>
            <label htmlFor="paper-lock-pin" className={styles.paperLockLabel}>Parent PIN</label>
            <input
              id="paper-lock-pin" className={styles.paperLockPin} type="password" inputMode="numeric"
              autoComplete="off" maxLength={4} value={pin} autoFocus
              onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
            <button type="submit" className={styles.paperLockQuiet} disabled={pin.length !== 4 || busy}>
              {busy ? "Working…" : "Lift for today"}
            </button>
          </form>
        ) : (
          <button type="button" className={styles.paperLockQuiet} onClick={() => setAsking(true)}>Parent: lift for today</button>
        )}
        {error ? <p role="alert" className={styles.paperLockError}>{error}</p> : null}
      </div>
    </section>
  );
}
