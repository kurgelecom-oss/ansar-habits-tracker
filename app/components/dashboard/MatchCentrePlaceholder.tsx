import type { MatchReadiness } from "../../dashboard/types";
import styles from "./dashboard.module.css";

/**
 * The Match Centre frame, before any football provider exists.
 *
 * IT INVENTS NOTHING. No opponent, no score, no competition, no kickoff, no
 * countdown — not even a plausible-looking placeholder one. Spec §5 is blunt
 * about it: a fabricated football result is a different category of truth
 * masquerading as fact, and a dash between two numbers is all it takes to read
 * as a scoreline. The frame says plainly that the data is not connected.
 *
 * Real Madrid's own crest is the one club asset shown, because it is the team
 * this board follows. There is no second crest, since inventing an opponent's
 * identity is exactly what §11.5 forbids.
 *
 * Match Readiness sits alongside, in its own labelled region — NEVER in the
 * space between two teams where a score will eventually go (spec §8.4). It
 * summarises learning state that the server already approved; it is not a
 * result, and it awards nothing.
 */
const JOURNAL_NOTE: Record<MatchReadiness["journalState"], string> = {
  NOT_REQUIRED: "No journal scheduled today",
  MISSING: "Journal not written yet",
  RECORDED: "Journal recorded",
  // Reachable only once real Tally evidence is matched. Nothing in this plan
  // produces it; the wording exists so the future phase has somewhere to land.
  VERIFIED: "Journal verified",
  OVERRIDE: "Journal — parent override",
};

export default function MatchCentrePlaceholder({ readiness }: { readiness: MatchReadiness }) {
  return (
    <section className={styles.matchCentre} aria-label="Real Madrid Match Centre">
      <div className={styles.matchFixture} data-testid="match-fixture">
        <img
          className={styles.matchCrest}
          src="/real-madrid.png"
          alt="Real Madrid"
        />
        <div className={styles.matchTeamCopy}>
          <p className={styles.matchTitle}>REAL MADRID</p>
          <p className={styles.matchTeamNote}>MATCH CENTRE</p>
        </div>
      </div>

      <div className={styles.matchCopy}>
        <p className={styles.matchUnavailable}>Fixture data not connected yet</p>
        <p className={styles.matchNote}>
          Real data will appear here after the football provider is approved.
        </p>
      </div>

      <div className={styles.matchReadiness} data-testid="match-readiness">
        <p className={styles.readinessLabel}>{readiness.label}</p>
        <p className={styles.readinessValue}>{readiness.percent}%</p>
        <div
          role="progressbar"
          aria-label={readiness.label}
          aria-valuenow={readiness.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className={styles.readinessTrack}
        >
          {/* Width, the figure above and aria-valuenow are all this one
              bounded number, so they cannot disagree. */}
          <div data-testid="readiness-fill" className={styles.readinessFill}
            style={{ width: `${readiness.percent}%` }} />
        </div>
        <p className={styles.readinessNote}>{JOURNAL_NOTE[readiness.journalState]}</p>
      </div>
    </section>
  );
}
