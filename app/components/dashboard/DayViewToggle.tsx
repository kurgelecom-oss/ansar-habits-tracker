import styles from "./dashboard.module.css";

/**
 * Weekday / Weekend view switch.
 *
 * PREVIEW ONLY, AND IT SAYS SO. The board's habits come from /api/tick, which
 * the SERVER has already filtered to its own Sydney weekday. This control does
 * not — and must not — change which day the server thinks it is. Choosing the
 * day that is not today rebuilds the roster from the Notion habit list so the
 * shape of that day can be seen, and every row in it is rendered LOCKED: a tick
 * belongs to a date, and the server would refuse one for a different day
 * anyway. Better to say that in the UI than to let a tap fail silently.
 *
 * When the chosen side matches the server's real day this is a no-op and the
 * live board is shown untouched.
 */
export type DayView = "weekday" | "weekend";

export default function DayViewToggle(
  { value, onChange, live }: { value: DayView; onChange: (v: DayView) => void; live: DayView | null },
) {
  return (
    <div className={styles.dayToggle} role="group" aria-label="Programme view">
      {(["weekday", "weekend"] as DayView[]).map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={value === v ? styles.dayToggleOn : styles.dayToggleOff}
          title={v === live ? "Today's real programme" : `Preview the ${v} programme — taps stay disabled`}
        >
          {v === "weekday" ? "Weekday" : "Weekend"}
        </button>
      ))}
    </div>
  );
}
