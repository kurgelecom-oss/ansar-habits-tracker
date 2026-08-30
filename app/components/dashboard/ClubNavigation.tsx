import type React from "react";
import styles from "./dashboard.module.css";

/**
 * The dashboard's own club navigation.
 *
 * NOT the shared TopNav. That one (app/components/TopNav.tsx) is the
 * cross-surface bar linking the six Kurgel properties and is byte-identical in
 * every repo. This bar is internal to ANSAR FC and names the club's own spaces.
 * Both are on screen at once, which is why this one is not fixed.
 *
 * Spec §7.2: only Dashboard may navigate. The other six are future products
 * with their own design contracts, and a link to a blank page is worse than no
 * link — so they are spans with no href, unfocusable and unfollowable, marked
 * aria-disabled with a quiet "Coming later". They are shown rather than hidden
 * so the shape of the finished product is legible from day one.
 *
 * `Table`, never `Leaderboards` (spec §7.1).
 */
const ITEMS: { label: string; icon: string; href?: string }[] = [
  { label: "Dashboard", icon: "\u{1F3E0}", href: "/" },
  { label: "Habits", icon: "\u{1F4CB}" },
  { label: "Quests", icon: "\u{1F3AF}" },
  { label: "Teams", icon: "\u{1F465}" },
  { label: "Leaderboards", icon: "\u{1F3C6}" },
  { label: "History", icon: "\u{1F551}" },
  { label: "Settings", icon: "\u2699\uFE0F" },
];

export default function ClubNavigation({ status = null }: { status?: React.ReactNode }) {
  return (
    <nav className={styles.clubNav} aria-label="ANSAR FC sections">
      {/* Crest only. The wordmark lives in ClubHeader, which is the dominant
          identity; printing "ANSAR FC" in both bars made neither the one the
          eye lands on. The crest keeps an accessible name so the bar is still
          identified to a screen reader. */}
      <span className={styles.clubMark} role="img" aria-label="ANSAR FC">
        <span className={styles.clubCrest} aria-hidden="true">
          <span className={styles.clubCrown}>♛</span>
          <span className={styles.clubCrestName}>ANSAR<br />FC</span>
          <span className={styles.clubBall}>⚽</span>
        </span>
      </span>

      <ul className={styles.clubNavList}>
        {ITEMS.map(item => (
          <li key={item.label}>
            {item.href ? (
              <a
                href={item.href}
                aria-current="page"
                className={`${styles.clubNavItem} ${styles.clubNavItemActive}`}
                data-testid="club-nav-item"
              >
                <span aria-hidden="true" className={styles.clubNavIcon}>{item.icon}</span>
                <span data-testid="club-nav-label">{item.label}</span>
              </a>
            ) : (
              <span
                aria-disabled="true"
                title="Coming later"
                className={`${styles.clubNavItem} ${styles.clubNavItemFuture}`}
                data-testid="club-nav-item"
              >
                <span aria-hidden="true" className={styles.clubNavIcon}>{item.icon}</span>
                <span data-testid="club-nav-label">{item.label}</span>
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* The live cluster the reference puts at this end of the bar: today,
          streak, both clocks and the connection state. A slot rather than
          props, so the nav stays a presentational bar and page.tsx keeps
          owning every value inside it. */}
      {status ? <div className={styles.clubNavStatus}>{status}</div> : null}
    </nav>
  );
}
