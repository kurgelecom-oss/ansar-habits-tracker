import type { DashboardHabit } from "../../dashboard/types";
import HabitRow from "./HabitRow";
import Panel from "./Panel";
import { DEFAULT_ICON, HABIT_ICONS } from "../../dashboard/icons";
import styles from "./dashboard.module.css";

/**
 * A column of habit rows for one block.
 *
 * Task 5 wires this to Morning only. Task 6 reuses HabitRow — not this panel —
 * for the Afternoon / Evening and Conditional subsections inside Today's
 * Programme, so those habits must not be folded in here.
 */
export type MorningFeasibility = {
  level: "red" | "amber";
  text: string;
  /** Minutes since Sydney midnight, as page.tsx computes it — not a clock string. */
  latestSafeNextTick: number;
  remaining: number;
};

type HabitPanelProps = {
  title: string;
  icon?: string;
  subtitle?: string;
  accent: string;
  habits: DashboardHabit[];
  doneCount: number;
  blockPoints: number;
  savingId?: string | null;
  holdId?: string | null;
  /**
   * Morning only. The one block whose dwell chain can outrun its own window,
   * because it is the only one with seven habits inside two hours. Rendered
   * above the rows so it is read before the next tap, not after it.
   */
  feasibility?: MorningFeasibility | null;
  onTick: (id: string, name: string) => void;
  onHoldStart: (habit: DashboardHabit) => void;
  onHoldCancel: () => void;
};

export default function HabitPanel({
  title, icon, subtitle, accent, habits, doneCount, blockPoints,
  savingId = null, holdId = null, feasibility = null,
  onTick, onHoldStart, onHoldCancel,
}: HabitPanelProps) {
  // An empty block renders nothing at all, exactly as the column it replaces
  // did. A panel with a title and no rows is a promise the day did not make.
  if (habits.length === 0) return null;

  return (
    <Panel
      title={title}
      icon={icon}
      subtitle={subtitle}
      accent={accent}
      summary={
        <>
          <span className={styles.panelCount}>{doneCount}/{habits.length}</span>
          <span className={styles.panelPoints}>{blockPoints} pts</span>
        </>
      }
      progress={{ done: doneCount, total: habits.length }}
      footer={
        <span className={styles.panelScore}>
          Score: <strong>{blockPoints > 0 ? `+${blockPoints}` : blockPoints} pts</strong>
        </span>
      }
    >
      {feasibility ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="morning-feasibility"
          data-level={feasibility.level}
          data-latest-safe-next-tick={feasibility.latestSafeNextTick}
          data-remaining={feasibility.remaining}
          className={feasibility.level === "red" ? styles.feasibilityRed : styles.feasibilityAmber}
        >
          {feasibility.text}
        </div>
      ) : null}

      {habits.map(habit => (
        <HabitRow
          key={habit.id}
          habit={habit}
          accent={accent}
          icon={HABIT_ICONS[habit.id] ?? DEFAULT_ICON}
          saving={savingId === habit.id}
          holding={holdId === habit.id}
          onTick={onTick}
          onHoldStart={onHoldStart}
          onHoldCancel={onHoldCancel}
        />
      ))}
    </Panel>
  );
}
