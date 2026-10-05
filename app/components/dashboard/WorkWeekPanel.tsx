import type { DashboardGoldenBoot, MatchReadiness } from "../../dashboard/types";
import Panel from "./Panel";
import styles from "./dashboard.module.css";

/**
 * Work + Week: the Tally trigger, the squad week, and the Golden Boot run.
 *
 * IT TRIGGERS THE MODAL AND NOTHING MORE. Every piece of Tally wiring — the
 * postMessage origin allow-list, the form URL, the embed script, the submitted
 * message and the reset — stays in app/page.tsx. This component knows only that
 * a button was pressed. Moving any of that here would put the intake form's
 * security boundary inside a presentational component.
 */
type WorkWeekPanelProps = {
  /** Mon–Fri days with `homeschool_session` done. null until the week has loaded. */
  schoolDays: number | null;
  /** Mon–Fri days with every applicable habit ticked. null until loaded. */
  fullDays: number | null;
  /** null while the week_results ledger has not answered; the run is hidden. */
  goldenBoot: DashboardGoldenBoot | null;
  /**
   * Tally submissions counted today, when a source exists. Nothing in the app
   * counts them yet, so null is the honest value and the panel says so.
   */
  submissionCount: number | null;
  readiness?: MatchReadiness;
  logOpen?: boolean;
  onOpenLogWork: () => void;
};

export default function WorkWeekPanel({
  schoolDays, fullDays, goldenBoot, submissionCount, readiness, logOpen = false, onOpenLogWork,
}: WorkWeekPanelProps) {
  const bootEarned = goldenBoot !== null && goldenBoot.progress >= goldenBoot.target;

  return (
    <Panel
      footer={
        <span className={styles.panelScore}>
          School days done{" "}
          <strong>{schoolDays === null ? "—" : `${schoolDays}/5`}</strong>
          {" · "}Full days{" "}
          <strong>{fullDays === null ? "—" : `${fullDays}/5`}</strong>
        </span>
      }
      title="Work + Week"
      icon="📝"
      subtitle="Log the day's work · Mon–Fri squad week"
      accent="var(--ansar-gold)"
    >
      <button
        type="button"
        className={styles.logWork}
        onClick={onOpenLogWork}
        aria-haspopup="dialog"
        aria-expanded={logOpen}
      >
        <span aria-hidden className={styles.logWorkIcon}>📝</span>
        Log Work
      </button>

      {/* Not a zero. A zero here would read as "you logged nothing today",
          which is a claim about Ansar's work rather than about the data. */}
      <p className={styles.submissionNote}>
        {submissionCount === null
          ? "Submission count not connected yet"
          : `${submissionCount} logged today`}
      </p>

      {readiness ? (
        <div className={styles.workReadiness} data-testid="work-readiness">
          <div className={styles.workReadinessHead}>
            <span>{readiness.label}</span>
            <strong>{readiness.percent}%</strong>
          </div>
          <div
            role="progressbar"
            aria-label={readiness.label}
            aria-valuenow={readiness.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className={styles.workReadinessTrack}
          >
            <span className={styles.workReadinessFill} style={{ width: `${readiness.percent}%` }} />
          </div>
          <p>{({
            NOT_REQUIRED: "No journal scheduled today",
            MISSING: "Journal not written yet",
            RECORDED: "Journal recorded",
            VERIFIED: "Journal verified",
            OVERRIDE: "Journal — parent override",
          } as const)[readiness.journalState]}</p>
        </div>
      ) : null}

      {goldenBoot ? (
        <p className={styles.goldenBoot}>
          {bootEarned ? (
            <>
              Golden Boot
              {/* At a full run the number stops being the point. */}
              <span role="img" aria-label="Golden Boot earned" className={styles.goldenBootIcon}>🏆</span>
            </>
          ) : (
            `Golden Boot ${goldenBoot.progress} / ${goldenBoot.target}`
          )}
        </p>
      ) : null}
    </Panel>
  );
}
