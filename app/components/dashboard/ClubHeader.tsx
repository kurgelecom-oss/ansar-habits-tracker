import styles from "./dashboard.module.css";
import WeekBadge from "./WeekBadge";

/**
 * The board's identity band.
 *
 * Identity ONLY. The clocks, streak and connection state live in ClubStatus,
 * inside the navigation bar — the masthead carries the club name centred on the
 * band and nothing else, so the wordmark never shifts off centre because the
 * clock got a digit wider.
 *
 * The one thing that shares the band is the week badge, pinned to the right
 * edge and taken OUT of the flow (absolute), so it can be any width without
 * touching the centred wordmark. It lives here and not in the nav because the
 * nav already overflows 1440px on production; the band has empty width on both
 * sides and nothing else to do with it. Which week the season is on is
 * identity-adjacent — it is the one live value that belongs next to the name.
 */
export default function ClubHeader() {
  return (
    <header className={styles.clubHeader}>
      {/* One text node, deliberately. The gold identity is carried by the rule
          beneath the header rather than by splitting the wordmark into spans.
          The motto under it is fixed brand copy, not data — it says nothing
          about points, results or progress and so cannot go stale or lie. */}
      <div className={styles.clubIdentity}>
        <h1 className={styles.clubWordmark}>Ansar · ANSAR FC</h1>
        <p className={styles.clubMotto}>Discipline Today. Greatness Forever.</p>
      </div>
      <div className={styles.clubWeek}>
        <WeekBadge />
      </div>
    </header>
  );
}
