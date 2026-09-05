import styles from "./dashboard.module.css";

/**
 * Sunday. The whole board is this one card (tk, 5 Sep 2026: "nothing to view
 * or track on Sundays — I want to push him harder on Saturdays"). The server
 * refuses every tick on a Sunday regardless, so this is a courtesy, not a gate.
 */
export default function RestDayCard() {
  return (
    <section className={styles.restDay} data-testid="rest-day" aria-label="Rest day">
      <p className={styles.restDayGlyph} aria-hidden>🛌</p>
      <h2 className={styles.restDayTitle}>Sunday — rest day</h2>
      <p className={styles.restDayCopy}>Nothing to tick. Nothing to track. The board is back Monday 6:30am.</p>
    </section>
  );
}
