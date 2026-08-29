import type React from "react";
import styles from "./dashboard.module.css";

/**
 * The shared panel anatomy every column uses (spec §10.1): one thin semantic
 * accent line, a title with optional subtitle, an optional compact summary, and
 * a body. Consistent padding and geometry live here rather than in each panel,
 * so four columns cannot drift apart by 2px at a time.
 *
 * There is deliberately no nested-card wrapper. Subsections inside a panel use
 * dividers, not a second border — a card inside a card is the thing the spec
 * calls out, and Today's Programme depends on staying legible at 1440 × 820.
 */
type PanelProps = {
  id?: string; title: string; subtitle?: string; accent: string;
  summary?: React.ReactNode; className?: string; children: React.ReactNode;
  /**
   * Optional completion bar under the header. Both numbers come from the same
   * rows the panel is already rendering, so the bar cannot disagree with the
   * count beside the title. Omitted entirely when there is nothing to divide.
   */
  progress?: { done: number; total: number } | null;
  /** Optional closing line, e.g. a block score. */
  footer?: React.ReactNode;
};

export default function Panel({
  id, title, subtitle, accent, summary, className, children,
  progress = null, footer = null,
}: PanelProps) {
  const pct = progress && progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : null;
  return (
    <section
      id={id}
      aria-label={title}
      className={className ? `${styles.panel} ${className}` : styles.panel}
    >
      {/* The accent is the panel's only colour identity. It is inline because
          the colour is caller-chosen per column, not a fixed class. */}
      <div className={styles.panelAccent} data-testid="panel-accent" style={{ background: accent }} />

      <header className={styles.panelHead}>
        <div className={styles.panelHeadText}>
          <h2 className={styles.panelTitle}>{title}</h2>
          {subtitle ? <p className={styles.panelSubtitle}>{subtitle}</p> : null}
        </div>
        {summary ? <div className={styles.panelSummary}>{summary}</div> : null}
      </header>

      {pct === null ? null : (
        <div
          className={styles.panelProgress}
          role="progressbar"
          aria-label={`${title} completed`}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          data-testid="panel-progress"
        >
          <div
            className={styles.panelProgressFill}
            data-testid="panel-progress-fill"
            style={{ width: `${pct}%`, background: accent }}
          />
        </div>
      )}

      <div className={styles.panelBody}>{children}</div>

      {footer ? <div className={styles.panelFooter}>{footer}</div> : null}
    </section>
  );
}
