import type { DashboardGoldenBoot } from "../../dashboard/types";
import Panel from "./Panel";
import WeeklyTierProgress from "./WeeklyTierProgress";
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
  /** null until the week's score has loaded. */
  weekPoints: number | null;
  weekMax: number;
  /** null while the week_results ledger has not answered; the run is hidden. */
  goldenBoot: DashboardGoldenBoot | null;
  /**
   * Tally submissions counted today, when a source exists. Nothing in the app
   * counts them yet, so null is the honest value and the panel says so.
   */
  submissionCount: number | null;
  logOpen?: boolean;
  onOpenLogWork: () => void;
};

export default function WorkWeekPanel({
  weekPoints, weekMax, goldenBoot, submissionCount, logOpen = false, onOpenLogWork,
}: WorkWeekPanelProps) {
  const bootEarned = goldenBoot !== null && goldenBoot.progress >= goldenBoot.target;

  return (
    <Panel
      title="Work + Week"
      icon="📝"
      subtitle="Log the day's work · Mon–Fri squad total"
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

      <WeeklyTierProgress weekPoints={weekPoints} weekMax={weekMax} />

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
