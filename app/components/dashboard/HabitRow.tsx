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
  onTick: (id: string, name: string) => void;
  onHoldStart: (habit: DashboardHabit) => void;
  onHoldCancel: () => void;
};

export default function HabitRow({
  habit, accent, saving = false, holding = false, icon,
  onTick, onHoldStart, onHoldCancel,
}: HabitRowProps) {
  const isDone = habit.state === "DONE";
  const isLive = habit.state === "LIVE";
  const isMissed = habit.state === "MISSED";
  const chip = habit.points > 0 ? `+${habit.points} pt${habit.points === 1 ? "" : "s"}` : "";

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
      title={habit.overridden ? "Parent override" : habit.window ? `Window ${habit.window}` : undefined}
      style={{ "--row-accent": accent } as React.CSSProperties}
    >
      {holding ? <span aria-hidden data-testid="hold-ring" className={styles.holdRing} /> : null}

      <span className={styles.habitBox}>
        {saving ? <span className={styles.habitGlyph}>⏳</span>
          : isDone ? <span className={styles.habitTick}>✓</span>
          : isMissed ? <span className={styles.habitGlyph}>✕</span>
          : !isLive ? <span className={styles.habitGlyph}>🔒</span>
          : null}
      </span>

      {icon ? <span aria-hidden className={styles.habitIcon}>{icon}</span> : null}

      <span className={styles.habitText}>
        <span className={styles.habitName}>{habit.name}</span>
        {/* The gate's own words for why this row is not actionable. Text, not
            colour alone — spec §13. */}
        {!isDone && !isLive && habit.label ? (
          <span className={isMissed ? styles.habitCaptionMissed : styles.habitCaption}>
            {habit.label}
          </span>
        ) : null}
      </span>

      {/* The audit marker. aria-hidden because the button's accessible name
          already carries it — announcing it twice is noise, but a sighted
          reader must still see that this was not earned. */}
      {habit.overridden ? (
        <span aria-hidden className={styles.overrideBadge}>
          {/* The glyph is a separate node so the badge's own text reads exactly
              "Parent override" — the audit wording the contract asserts on. */}
          <span className={styles.overrideGlyph}>⟲</span>
          Parent override
        </span>
      ) : null}

      {chip ? <span className={styles.pointChip}>{chip}</span> : null}
    </button>
  );
}
