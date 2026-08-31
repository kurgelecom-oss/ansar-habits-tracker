import type { DashboardHabit } from "../../dashboard/types";
import { guidanceFor, noteFor } from "../../dashboard/rowCopy";
import { DEFAULT_ICON, HABIT_ICONS } from "../../dashboard/icons";
import HabitRow from "./HabitRow";
import styles from "./dashboard.module.css";

/**
 * The Homeschool subsection of Today's Programme.
 *
 * WHATEVER NOTION FILES HERE, IN NOTION'S ORDER. This section used to be
 * "journal, then the session" and knew the journal's copy by name. The journal
 * has since moved to Afternoon / Evening (order 16.5, between "Teeth brushed"
 * and "Reading in bed"), so the section now renders what it is handed and asks
 * dashboard/rowCopy.ts for the words — the copy travels with the habit instead
 * of with the heading it happened to sit under.
 *
 * Nothing is hidden or dropped for being worth zero points (spec §10.3).
 */
type HomeschoolSectionProps = {
  habits: DashboardHabit[];
  savingId?: string | null;
  holdId?: string | null;
  onTick: (id: string, name: string) => void;
  onHoldStart: (habit: DashboardHabit) => void;
  onHoldCancel: () => void;
};

export default function HomeschoolSection({
  habits, savingId = null, holdId = null, onTick, onHoldStart, onHoldCancel,
}: HomeschoolSectionProps) {
  if (habits.length === 0) return null;

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
            note={noteFor(habit)}
            description={guidanceFor(habit)}
            onTick={onTick}
            onHoldStart={onHoldStart}
            onHoldCancel={onHoldCancel}
          />
        </div>
      ))}
    </>
  );
}
