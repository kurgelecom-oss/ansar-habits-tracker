import type { DashboardHabit } from "../../dashboard/types";
import { journalEvidenceState } from "../../dashboard/model";
import { DEFAULT_ICON, HABIT_ICONS } from "../../dashboard/icons";
import HabitRow from "./HabitRow";
import styles from "./dashboard.module.css";

/**
 * The Homeschool subsection of Today's Programme.
 *
 * JOURNAL FIRST, ALWAYS. It is order 7.5 and worth zero points, so any sort
 * keyed on value would bury the one row the five-point session depends on. It
 * is a prerequisite, so it may render quieter than a scored habit — but never
 * hidden, and never dropped because its point value is zero (spec §10.3).
 *
 * The completed journal reads "Recorded". Not "Verified": nothing here matches
 * a Tally entry, and describing a self-certified tick as verified evidence is
 * the exact confusion of truth categories spec §5 forbids. An overridden
 * journal needs no note at all — HabitRow's gold audit badge already says
 * "Parent override", and saying it twice would only blur what it means.
 */
type HomeschoolSectionProps = {
  habits: DashboardHabit[];
  savingId?: string | null;
  holdId?: string | null;
  onTick: (id: string, name: string) => void;
  onHoldStart: (habit: DashboardHabit) => void;
  onHoldCancel: () => void;
};

const JOURNAL_ID = "journal";
const GUIDANCE: Record<string, string> = {
  journal: "Tap when your journal entry is written",
  homeschool_session: "Tap when 4 hours are completed",
};

export default function HomeschoolSection({
  habits, savingId = null, holdId = null, onTick, onHoldStart, onHoldCancel,
}: HomeschoolSectionProps) {
  if (habits.length === 0) return null;

  const evidence = journalEvidenceState(habits.find(h => h.id === JOURNAL_ID));

  return (
    <>
      {habits.map(habit => (
        <div key={habit.id} data-testid="homeschool-item" className={styles.programmeItem}>
          <HabitRow
            habit={habit}
            accent="var(--cyan)"
            icon={HABIT_ICONS[habit.id] ?? DEFAULT_ICON}
            saving={savingId === habit.id}
            holding={holdId === habit.id}
            note={habit.id === JOURNAL_ID && evidence === "RECORDED" ? "Recorded" : undefined}
            description={GUIDANCE[habit.id]}
            onTick={onTick}
            onHoldStart={onHoldStart}
            onHoldCancel={onHoldCancel}
          />
        </div>
      ))}
    </>
  );
}
