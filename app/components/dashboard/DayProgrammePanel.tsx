import type { DashboardHabit } from "../../dashboard/types";
import { guidanceFor, noteFor } from "../../dashboard/rowCopy";
import { DEFAULT_ICON, HABIT_ICONS } from "../../dashboard/icons";
import HabitRow from "./HabitRow";
import HomeschoolSection from "./HomeschoolSection";
import Panel from "./Panel";
import styles from "./dashboard.module.css";

/**
 * The second column: everything the day asks for that is not a morning habit.
 *
 * ONE PANEL, THREE SUBSECTIONS. Contract amendment 8027d53 replaced a
 * Homeschool-only column with this, because the four-column grid had no slot
 * for the six Afternoon / Evening habits or for soccer training — and a habit
 * configured in Notion that never reaches the screen is worse than an ugly
 * layout. Subsections are dividers inside one card, not cards inside a card
 * (spec §10.3); nested borders are what stops the full programme fitting at
 * 1440 × 820.
 *
 * Order is fixed: Homeschool, Afternoon / Evening, Conditional. A weekend
 * removes ONLY Homeschool — Afternoon / Evening is scheduled seven days a week
 * and stays. Conditional appears when the day actually schedules it.
 *
 * Within a section the rows are in Notion's Order, which is what puts the daily
 * journal between "Teeth brushed" and "Reading in bed" rather than up in
 * Homeschool. Nothing here hardcodes that position: move the row in Notion and
 * it moves on screen, and dashboard/rowCopy.ts carries its words along with it.
 *
 * Rows are the same HabitRow the Morning panel uses, so LOCKED and MISSED stay
 * pointer-reachable and the parent's override hold works identically here.
 */
type DayProgrammePanelProps = {
  homeschool: DashboardHabit[];
  afternoonEvening: DashboardHabit[];
  conditional: DashboardHabit[];
  savingId?: string | null;
  holdId?: string | null;
  onTick: (id: string, name: string) => void;
  onHoldStart: (habit: DashboardHabit) => void;
  onHoldCancel: () => void;
};

export default function DayProgrammePanel({
  homeschool, afternoonEvening, conditional,
  savingId = null, holdId = null, onTick, onHoldStart, onHoldCancel,
}: DayProgrammePanelProps) {
  const all = [...homeschool, ...afternoonEvening, ...conditional];
  if (all.length === 0) return null;

  const doneCount = all.filter(h => h.state === "DONE").length;

  const rows = (habits: DashboardHabit[], accent: string) =>
    habits.map(habit => (
      <div key={habit.id} data-testid={`programme-${habit.id}`} className={styles.programmeItem}>
        <HabitRow
          habit={habit}
          accent={accent}
          icon={HABIT_ICONS[habit.id] ?? DEFAULT_ICON}
          saving={savingId === habit.id}
          holding={holdId === habit.id}
          // Same source the Homeschool subsection reads. The journal's
          // "Recorded" caption and BTN's "Parent PIN" marker have to render
          // here now that both habits live in this section.
          note={noteFor(habit)}
          description={guidanceFor(habit)}
          onTick={onTick}
          onHoldStart={onHoldStart}
          onHoldCancel={onHoldCancel}
        />
      </div>
    ));

  return (
    <Panel
      footer={(() => {
        const all = [...homeschool, ...afternoonEvening, ...conditional];
        const earned = all.filter(h => h.state === "DONE").reduce((n, h) => n + h.points, 0);
        return (
          <span className={styles.panelScore}>
            Programme Score:{" "}
            <strong>{earned > 0 ? `+${earned}` : earned} pts</strong>
          </span>
        );
      })()}
      title="Today's Programme"
      icon="🗓️"
      subtitle="Homeschool · Afternoon / Evening · Conditional"
      accent="var(--ansar-success)"
      summary={
        <>
          <span className={styles.panelCount}>{doneCount}/{all.length}</span>
          <span className={styles.panelPoints}>done</span>
        </>
      }
    >
      {homeschool.length > 0 ? (
        <section data-testid="programme-section" data-section="Homeschool" className={styles.programmeSection}>
          <h3 className={styles.programmeSectionTitle}>📚 Homeschool</h3>
          <HomeschoolSection
            habits={homeschool}
            savingId={savingId}
            holdId={holdId}
            onTick={onTick}
            onHoldStart={onHoldStart}
            onHoldCancel={onHoldCancel}
          />
        </section>
      ) : null}

      {afternoonEvening.length > 0 ? (
        <section data-testid="programme-section" data-section="Afternoon / Evening" className={styles.programmeSection}>
          <h3 className={styles.programmeSectionTitle}>🌆 Afternoon / Evening</h3>
          {rows(afternoonEvening, "var(--ansar-success)")}
        </section>
      ) : null}

      {conditional.length > 0 ? (
        <section data-testid="programme-section" data-section="Conditional" className={styles.programmeSection}>
          <h3 className={styles.programmeSectionTitle}>⚽ Conditional</h3>
          {rows(conditional, "var(--ansar-wallet)")}
        </section>
      ) : null}
    </Panel>
  );
}
