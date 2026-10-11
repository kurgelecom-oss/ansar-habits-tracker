"use client";
import Link from "next/link";
import { useState } from "react";
import styles from "./dashboard.module.css";
import type { PaperLock } from "./usePaperLock";

/**
 * The paper lock (tk, 5 + 11 Oct 2026). While a Friday review or that day's
 * exam is due and not handed in, the board shows this and nothing else except
 * the Morning Habits, which never lock. It names what is due and takes him to
 * Tests. A parent can always lift it for today with the PIN: a small, quiet
 * "Parent" link, there as a fallback, not as a way round the work.
 *
 * It only REPORTS the lock. The server refuses every locked tick anyway
 * (lib/assessments/gate.ts), so hiding this screen unlocks nothing.
 */
export default function AssessmentLockCard({ lock, onLifted, fullScreen = false }: {
  lock: PaperLock | null; onLifted: () => void; fullScreen?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      else { setPin(""); setAsking(false); onLifted(); }
    } catch { setError("Could not reach the server."); }
    finally { setBusy(false); }
  }

  const card = (
    <section className={`${styles.paperLock} ${fullScreen ? styles.paperLockFull : ""}`} aria-label="A paper is due" data-testid="paper-lock">
      <div className={styles.paperLockText}>
        <h2 className={styles.paperLockTitle}>Hand this in first</h2>
        <ul className={styles.paperLockList}>
          {lock.due.map(p => <li key={p.id}>{p.title}</li>)}
        </ul>
        <p className={styles.paperLockNote}>
          The board is locked until {lock.due.length === 1 ? "this is" : "these are"} handed in. Morning habits stay open.
        </p>
      </div>
      <div className={styles.paperLockActions}>
        <Link href="/tests" className={styles.paperLockGo}>Open Tests</Link>
      </div>
      <div className={styles.paperLockParent}>
        {asking ? (
          <form onSubmit={lift} className={styles.paperLockForm}>
            <label htmlFor="paper-lock-pin" className={styles.paperLockLabel}>Parent PIN</label>
            <input
              id="paper-lock-pin" className={styles.paperLockPin} type="password" inputMode="numeric"
              autoComplete="off" maxLength={4} value={pin} autoFocus
              onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
            <button type="submit" className={styles.paperLockQuiet} disabled={pin.length !== 4 || busy}>
              {busy ? "Working…" : "Unlock for today"}
            </button>
            <button type="button" className={styles.paperLockQuiet} onClick={() => { setAsking(false); setPin(""); setError(""); }}>Cancel</button>
          </form>
        ) : (
          <button type="button" className={styles.paperLockParentLink} onClick={() => setAsking(true)}>Parent</button>
        )}
        {error ? <p role="alert" className={styles.paperLockError}>{error}</p> : null}
      </div>
    </section>
  );

  return fullScreen ? <div className={styles.paperLockScreen} role="dialog" aria-modal="true" aria-label="A paper is due">{card}</div> : card;
}
