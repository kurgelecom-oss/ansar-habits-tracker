import type { MatchReadiness } from "../../dashboard/types";
import styles from "./dashboard.module.css";

/**
 * The Match Centre, showing a PREVIEW fixture.
 *
 * ── READ THIS BEFORE CONNECTING A REAL PROVIDER ──────────────────────────────
 * The score below is DUMMY DATA, requested by the owner so the finished
 * composition can be judged before a football provider exists. It is not a real
 * result and must never reach production as-is. The frame carries a small
 * PREVIEW tag and the region's accessible name says "Preview fixture" so the
 * numbers cannot be mistaken for fact by eye or by screen reader.
 *
 * When the provider lands, delete PREVIEW_FIXTURE and take the same fields from
 * the API. The layout does not change — that is the point of building it now.
 *
 * Match Readiness sits in its own labelled region, pinned to the right edge and
 * NEVER in the space between the two teams where the score goes (spec §8.4). It
 * is absolutely positioned so the fixture centres on the PANEL rather than on
 * the space left over beside it.
 */
const PREVIEW_FIXTURE = {
  home: { name: "REAL MADRID", competition: "La Liga", crest: "/real-madrid.png", goals: 2 },
  away: { name: "REAL SOCIEDAD", competition: "La Liga", crest: "/real-sociedad.png", goals: 0 },
  status: "Full Time",
} as const;

const JOURNAL_NOTE: Record<MatchReadiness["journalState"], string> = {
  NOT_REQUIRED: "No journal scheduled today",
  MISSING: "Journal not written yet",
  RECORDED: "Journal recorded",
  VERIFIED: "Journal verified",
  OVERRIDE: "Journal — parent override",
};

export default function MatchCentrePlaceholder({ readiness }: { readiness: MatchReadiness }) {
  const { home, away, status } = PREVIEW_FIXTURE;

  return (
    <section
      className={styles.matchCentre}
      aria-label={`Preview fixture — Real Madrid ${home.goals}, Real Sociedad ${away.goals}`}
    >
      <span className={styles.matchPreviewTag}>Preview</span>

      <div className={styles.matchFixture} data-testid="match-fixture">
        {/* Home: crest outermost, name reading in toward the score. */}
        <div className={`${styles.matchTeam} ${styles.matchTeamHome}`}>
          <img className={styles.matchCrest} src={home.crest} alt="Real Madrid" />
          <div className={styles.matchTeamText}>
            <p className={styles.matchTeamName}>{home.name}</p>
            <p className={styles.matchTeamMeta}>{home.competition}</p>
          </div>
        </div>

        <div className={styles.matchScore}>
          <p className={styles.matchScoreLine} data-testid="match-score">
            <span className={styles.matchGoals}>{home.goals}</span>
            <span className={styles.matchScoreDash}>-</span>
            <span className={styles.matchGoals}>{away.goals}</span>
          </p>
          <p className={styles.matchStatus}>{status}</p>
        </div>

        {/* Away: mirrored — name first, crest outermost. */}
        <div className={`${styles.matchTeam} ${styles.matchTeamAway}`}>
          <div className={styles.matchTeamText}>
            <p className={styles.matchTeamName}>{away.name}</p>
            <p className={styles.matchTeamMeta}>{away.competition}</p>
          </div>
          <img className={styles.matchCrest} src={away.crest} alt="Real Sociedad" />
        </div>
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
