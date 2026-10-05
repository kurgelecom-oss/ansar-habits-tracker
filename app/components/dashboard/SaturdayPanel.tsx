import type { SaturdayPs5 } from "../../lib/weekend";
import { WEEKEND_UNLOCK_MIN_SCHOOL_DAYS } from "../../lib/weekend";
import Panel from "./Panel";
import styles from "./dashboard.module.css";

/**
 * The Saturday card — what replaces the Stretch Wallet in column four.
 *
 * Two rules, both decided elsewhere and only reported here (lib/weekend.ts):
 *
 *   1. THE WEEK DECIDES IF.   `schoolDays` is how many of Mon–Fri had school
 *                              finished, the count Work + Week already shows.
 *   2. SATURDAY DECIDES WHEN. `ps5.pushDone`/`pushTotal` count DONE rows in the
 *                              Saturday Push block as /api/tick reports them.
 *
 * There is nothing to tap here. The Push rows live in Today's Programme; this
 * card is the verdict, the streak, and one sentence about what happens next.
 */
type SaturdayPanelProps = {
  schoolDays: number | null;
  ps5: SaturdayPs5;
  /** Saturdays in a row with the full Push verified. null while loading. */
  saturdayStreak: number | null;
};

export default function SaturdayPanel({ schoolDays, ps5, saturdayStreak }: SaturdayPanelProps) {
  const weekLine = schoolDays === null
    ? "Week: —"
    : `Week: school days done ${schoolDays}/5`;

  return (
    <Panel
      footer={
        <span className={styles.panelScore}>
          Saturdays in a row:{" "}
          <strong data-testid="saturday-streak">{saturdayStreak === null ? "—" : saturdayStreak}</strong>
        </span>
      }
      title="Saturday"
      icon="🎮"
      subtitle={`Week earns it (school ${WEEKEND_UNLOCK_MIN_SCHOOL_DAYS}+ days) · Push starts it`}
      accent="var(--ansar-wallet)"
      className={styles.walletPanel}
      summary={
        <span data-testid="ps5-verdict" className={styles.walletBalance}>
          {ps5.ready ? "PS5 ✅" : "PS5 🔒"}
        </span>
      }
    >
      <p className={ps5.weekUnlocked ? styles.walletBonusOn : styles.walletLock} data-testid="ps5-week">
        {ps5.weekUnlocked ? "✅ " : <span aria-hidden className={styles.walletLockGlyph}>🔒</span>}
        {weekLine}{ps5.weekUnlocked ? " — weekend earned" : " — weekend not earned"}
      </p>
      <p className={ps5.pushComplete ? styles.walletBonusOn : styles.walletBonus} data-testid="ps5-push">
        {ps5.pushComplete ? "🏆 " : "🔥 "}
        Saturday Push {ps5.pushDone}/{ps5.pushTotal} verified
      </p>
      <p className={styles.walletNote} data-testid="ps5-message">{ps5.message}</p>
    </Panel>
  );
}
