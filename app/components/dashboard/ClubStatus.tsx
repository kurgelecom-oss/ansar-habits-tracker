import type { DashboardServerTime } from "../../dashboard/types";
import styles from "./dashboard.module.css";

/**
 * The board's live status cluster: today, streak, both clocks, and the
 * connection state.
 *
 * It used to sit inside ClubHeader. It moved into the navigation bar so the
 * masthead can carry the club identity alone and centred — the wordmark is the
 * one thing on this board that should never share a line.
 *
 * TWO CLOCKS, AND THE DIFFERENCE IS THE POINT. The server's Sydney clock is the
 * one every gate is decided against; the device's is display only. They are
 * shown in that order, styled differently, and each carries a title saying
 * which it is — changing the iPad's clock changes nothing, and the board has
 * to make that legible (spec §13). Neither this component nor anything below it
 * may read a local clock to decide anything.
 */
type ClubStatusProps = {
  /** /api/tick's Sydney clock. null until the gate answers — render no clock. */
  serverTime: DashboardServerTime | null;
  /** The device's own clock, already formatted. "" before mount. */
  deviceTime: string;
  online: boolean;
  /**
   * From /api/settings. `null` means the route has not answered yet, which is
   * not the same as points being off — an unanswered route must not flash a
   * soft-launch badge that may be wrong a moment later.
   */
  pointsActive: boolean | null;
  /**
   * Today's proportion complete and the streak, carried over from the
   * scoreboard strip the Match Centre replaces. Spec §7.3 allows a compact
   * points/streak summary here; both are optional, and undefined renders
   * nothing rather than a zero.
   */
  todayPercent?: number | null;
  streak?: number | null;
};

export default function ClubStatus({
  serverTime, deviceTime, online, pointsActive,
  todayPercent = null, streak = null,
}: ClubStatusProps) {
  return (
    <div className={styles.clubStatus}>
      {pointsActive === false ? (
        <span className={styles.softLaunch}>Soft-launch · points preview</span>
      ) : null}

      {todayPercent !== null || streak !== null ? (
        <div className={styles.progressCard} role="group" aria-label="Daily progress">
          {todayPercent === null ? null : (
            <span className={styles.statusMetric} title="Today's applicable habits completed">
              <span aria-hidden className={styles.statusMetricIcon}>★</span>
              <span><strong>{todayPercent}%</strong><small> today</small></span>
            </span>
          )}

          {streak === null ? null : (
            <span className={styles.statusMetric} title="Consecutive qualifying days">
              <span aria-hidden className={styles.statusMetricIcon}>🔥</span>
              <span><strong>{streak}</strong><small> day streak</small></span>
            </span>
          )}
        </div>
      ) : null}

      {serverTime ? (
        <div className={styles.clockCard} role="group" aria-label="Sydney time">
          <span className={styles.serverClock} title="Server clock — every gate uses this">
            {serverTime.clock}<br />{serverTime.weekday} · Sydney
          </span>
        </div>
      ) : null}

      <span className={styles.statusMeta}>
        <span className={styles.deviceClock} title="This device's clock — display only, no gate reads it">
          device {deviceTime}
        </span>

        {/* Colour alone is not a status (spec §13), so the word is always there
            and the dot is decorative. */}
        <span className={styles.connection}>
          <span
            className={online ? styles.connectionDotLive : styles.connectionDotOffline}
            aria-hidden="true"
          />
          <span className={online ? styles.connectionTextLive : styles.connectionTextOffline}>
            {online ? "Live" : "Offline"}
          </span>
        </span>
      </span>
    </div>
  );
}
