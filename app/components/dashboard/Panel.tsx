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
};

export default function Panel({
  id, title, subtitle, accent, summary, className, children,
}: PanelProps) {
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

      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}
