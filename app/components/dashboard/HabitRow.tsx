import type React from "react";
import type { DashboardHabit } from "../../dashboard/types";
import styles from "./dashboard.module.css";

/**
 * One habit, in one of four server-decided states, plus the override marker.
 *
 *   DONE    ticked, struck through
 *   LIVE    full colour, tappable — the only actionable state
 *   LOCKED  muted but legible, and says when it opens ("Opens 1:30pm")
 *   MISSED  restrained red, says "Missed" — this one scores zero
 *
 * MISSED is tinted rather than merely dimmed: a missed window is a different
 * fact from a not-yet-open one, and the board must not make them look the same.
 *
 * ── WHY LOCKED AND MISSED ARE NOT HTML-DISABLED ──────────────────────────────
 * A disabled <button> fires no pointer events. The parent override is reached
 * by a two-second hold on a refused row, so disabling those rows would remove
 * the override door from the entire board without any test noticing. They carry
 * aria-disabled instead: assistive tech is told they are not actionable, the
 * pointer still reaches them, and the SERVER remains the thing that refuses the
 * tick. `disabled` is used for exactly one case — a write already in flight.
 *
 * This component decides nothing. It renders the state it is handed and
 * forwards events; every gate, every refusal and every override is settled by
 * /api/tick.
 */
type HabitRowProps = {
  habit: DashboardHabit;
  /** The owning block's colour. */
  accent: string;
  /** True while this row's own write is in flight. */
  saving?: boolean;
  /** True while the parent's hold is running on this row. */
  holding?: boolean;
  icon?: string;
  /**
   * A caption that shows regardless of state, for evidence language the gate
   * does not supply — currently only the journal's "Recorded". `label` is the
   * gate's own reason and only shows on rows that are not actionable; this is
   * additive and never overwrites it.
   */
  note?: string;
  onTick: (id: string, name: string) => void;
  onHoldStart: (habit: DashboardHabit) => void;
  onHoldCancel: () => void;
};

export default function HabitRow({
  habit, accent, saving = false, holding = false, icon, note,
  onTick, onHoldStart, onHoldCancel,
}: HabitRowProps) {
  const isDone = habit.state === "DONE";
  const isLive = habit.state === "LIVE";
  const isMissed = habit.state === "MISSED";
  const chip = habit.points > 0 ? `+${habit.points} pt${habit.points === 1 ? "" : "s"}` : "";
  const emphasis = habit.id === "journal" ? "journal"
    : habit.id === "homeschool_session" ? "homeschool" : undefined;

  const stateClass = isDone ? styles.habitRowDone
    : isLive ? styles.habitRowLive
    : isMissed ? styles.habitRowMissed
    : styles.habitRowLocked;

  return (
    <button
      type="button"
      className={`${styles.habitRow} ${stateClass}`}
      onClick={() => onTick(habit.id, habit.name)}
      disabled={saving}
      aria-disabled={!isLive}
      onPointerDown={() => onHoldStart(habit)}
      onPointerUp={onHoldCancel}
      onPointerLeave={onHoldCancel}
      onPointerCancel={onHoldCancel}
      onContextMenu={event => event.preventDefault()}
      aria-label={habit.overridden ? `${habit.name} — restored by parent override` : habit.name}
      data-habit-id={habit.id}
      data-emphasis={emphasis}
      title={[
        habit.overridden ? "Parent override" : "",
        !isDone && !isLive && habit.label ? habit.label : "",
        habit.window ? `Window ${habit.window}` : "",
      ].filter(Boolean).join(" · ") || undefined}
      style={{ "--row-accent": accent } as React.CSSProperties}
    >
      {holding ? <span aria-hidden data-testid="hold-ring" className={styles.holdRing} /> : null}

      {icon ? <span aria-hidden className={styles.habitIcon}>{icon}</span> : null}

      {/* One line, always. The reason and the note live in the row's
          accessible name and tooltip instead of under the habit — the visible
          state is carried by three distinct glyphs (✓ ✕ 🔒), not by colour. */}
      <span className={styles.habitText}>
        <span className={styles.habitName}>{habit.name}</span>
        {note ? <span className={styles.habitNote}>{note}</span> : null}
      </span>

      {/* The audit marker, reduced to a dot so the row stays one line. It is
          NOT removed: without some visible trace an overridden habit looks
          exactly like an earned one, and that is an audit problem rather than a
          styling one. The wording rides along in a visually-hidden span so it
          stays readable to assistive tech and greppable by the contract. */}
      {habit.overridden ? (
        <span className={styles.overrideBadge} title="Parent override">
          <span aria-hidden className={styles.overrideGlyph} />
          <span className={styles.overrideWord}>Parent override</span>
        </span>
      ) : null}

      {chip ? <span className={styles.pointChip}>{chip}</span> : null}

      {/* The state marker sits at the END of the row, where a checkbox is
          expected and where the eye lands after reading the habit. It is the
          last thing in the DOM as well as the last thing on screen, so tab and
          screen-reader order match what a sighted reader sees. */}
      <span className={styles.habitBox}>
        {saving ? <span className={styles.habitGlyph}>⏳</span>
          : isDone ? <span className={styles.habitTick}>✓</span>
          : isMissed ? <span className={styles.habitGlyph}>✕</span>
          : !isLive ? <span className={styles.habitGlyph}>🔒</span>
          : null}
      </span>
    </button>
  );
}
