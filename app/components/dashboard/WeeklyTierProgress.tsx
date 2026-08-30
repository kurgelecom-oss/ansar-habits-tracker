import { getTier } from "../../dashboard/model";
import styles from "./dashboard.module.css";

/**
 * The week's squad tier: where it stands now, and the four stops it moves
 * between.
 *
 * The old board gave each tier an equal tile in a 2x2 grid, which spent a
 * quarter of the column on three tiers the week is not in. Spec §10.4 asks for
 * the inverse — one current-tier summary plus a compact threshold scale — so
 * the reached tier is stated once, large, and the rest are a thin track.
 *
 * Boundaries come from getTier(), which reads them from lib/scoring.ts. They
 * are not re-typed here; that duplication is what check-scoring-sync.sh exists
 * to catch.
 */
type WeeklyTierProgressProps = {
  /** null until /api/... answers. Not 0 — an unknown week is not a bad week. */
  weekPoints: number | null;
  weekMax: number;
};

export default function WeeklyTierProgress({ weekPoints, weekMax }: WeeklyTierProgressProps) {
  const tier = getTier(weekPoints ?? 0);
  // A weekend can push the total past a ceiling built from weekday points, so
  // the bar is clamped. The number beside it still reads honestly.
  const percent = weekPoints === null || weekMax <= 0
    ? 0
    : Math.min(100, Math.round((weekPoints / weekMax) * 100));

  /**
   * What the bar ANNOUNCES, which must never contradict what it draws.
   *
   * undefined while the score is unknown: the track then has no aria-valuenow
   * at all and is read as indeterminate, matching the em dash on screen. A 0
   * would announce a real week in which nothing was earned.
   *
   * Clamped otherwise, because the fill caps at 100% and a valuenow outside
   * valuemin..valuemax is an invalid range that screen readers handle however
   * they please. The visible total beside the bar stays unclamped and honest.
   */
  const announcedValue = weekPoints === null
    ? undefined
    : Math.max(0, Math.min(weekMax, weekPoints));

  return (
    <div className={styles.tierBlock}>
      {/* The total carries the tier's colour rather than repeating its name.
          The name is stated once, on the promoted stop below — a ladder that
          prints "First Team" twice makes neither instance mean anything. */}
      <div className={styles.tierHead}>
        <span className={styles.tierTotal} style={{ color: weekPoints === null ? undefined : tier.color }}>
          {weekPoints === null ? "—" : weekPoints} / {weekMax}
        </span>
        <span className={styles.tierCaption}>this week</span>
      </div>

      <div
        role="progressbar"
        aria-label="Week total"
        aria-valuenow={announcedValue}
        aria-valuemin={0}
        aria-valuemax={weekMax}
        className={styles.tierTrack}
      >
        <div data-testid="tier-fill" className={styles.tierFill}
          style={{ width: `${percent}%`, background: tier.color }} />
      </div>

      <ul className={styles.tierScale}>
        {tier.thresholds.map(stop => {
          // Exactly one stop is "reached": the highest whose minimum the week
          // has met. Everything below it is passed, not current.
          const active = weekPoints !== null && tier.min === stop.min;
          return (
            <li
              key={stop.min}
              data-testid="tier-threshold"
              data-min={stop.min}
              data-active={active}
              className={active ? styles.tierStopActive : styles.tierStop}
            >
              <span className={styles.tierDot} style={{ background: stop.color }} />
              {/* The reached stop IS the current-tier summary: promoted, named,
                  and the only place the tier's name appears. */}
              <span
                data-testid={active ? "tier-current" : undefined}
                className={styles.tierStopLabel}
              >
                {stop.label}
              </span>
              <span className={styles.tierStopMin}>{stop.desc.replace(" pts", "")}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
