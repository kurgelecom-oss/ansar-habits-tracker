import type { DashboardServerTime } from "../../dashboard/types";
import styles from "./dashboard.module.css";

/**
 * The board's identity and status line.
 *
 * TWO CLOCKS, AND THE DIFFERENCE IS THE POINT. The server's Sydney clock is the
 * one every gate is decided against; the device's is display only. They are
 * shown in that order, styled differently, and each carries a title saying
 * which it is — changing the iPad's clock changes nothing, and the header has
 * to make that legible (spec §13). Neither this component nor anything below it
 * may read a local clock to decide anything.
 */
type ClubHeaderProps = {
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
};

export default function ClubHeader({
  serverTime, deviceTime, online, pointsActive,
}: ClubHeaderProps) {
  return (
    <header className={styles.clubHeader}>
      {/* One text node, deliberately. The gold identity is carried by the rule
          beneath the header rather than by splitting the wordmark into spans. */}
      <h1 className={styles.clubWordmark}>Ansar · ANSAR FC</h1>

      <div className={styles.clubStatus}>
        {pointsActive === false ? (
          <span className={styles.softLaunch}>Soft-launch · points preview</span>
        ) : null}

        {serverTime ? (
          <span className={styles.serverClock} title="Server clock — every gate uses this">
            🕒 {serverTime.clock} {serverTime.weekday} · Sydney
          </span>
        ) : null}

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
      </div>
    </header>
  );
}
