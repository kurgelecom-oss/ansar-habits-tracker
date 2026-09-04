import type React from "react";
import styles from "./dashboard.module.css";
import { CONTROL_ROOM_FALLBACK_URL } from "../../lib/notion-sources";

/**
 * The dashboard's own club navigation.
 *
 * NOT the shared TopNav. That one (app/components/TopNav.tsx) is the
 * cross-surface bar linking the six Kurgel properties and is byte-identical in
 * every repo. This bar is internal to ANSAR FC and names the club's own spaces.
 * Both are on screen at once, which is why this one is not fixed.
 *
 * Progress is the only new surface that is live in this stage. The remaining
 * labels deliberately stay disabled until their underlying data model exists:
 * a link to an empty screen would imply a feature that has not been built.
 *
 * Settings is the one exception. Until a real settings screen exists it opens
 * the Notion page that actually owns the board's configuration — 🎛️ ANSAR OS —
 * Control Room, which holds all three App Source tables — so a parent mid-edit
 * reaches them from the top bar instead of scrolling to the source strip at the
 * foot of the board. It leaves the app, so it opens in its own tab and is NOT
 * aria-current.
 *
 * The URL is a PROP, fed from App Settings → "Control Room" via /api/settings.
 * It was briefly a constant in this file, which is exactly the pattern the
 * 2 Sept 2026 reorganisation was undoing: a link that moves in Notion and goes
 * stale in a component nobody thinks to grep. The default only covers the first
 * paint, before settings have loaded.
 *
 * `Table`, never `Leaderboards` (spec §7.1).
 */
const ITEMS: { label: string; icon: string; href?: string; external?: boolean }[] = [
  { label: "Dashboard", icon: "\u{1F3E0}", href: "/" },
  { label: "Progress", icon: "\u{1F4C8}", href: "/progress" },
  { label: "Targets", icon: "\u{1F3AF}", href: "/targets" },
  { label: "Tests", icon: "\u{1F4DA}", href: "/tests" },
  { label: "Leaderboards", icon: "\u{1F3C6}", href: "/leaderboards" },
  { label: "History", icon: "\u{1F551}" },
  { label: "Settings", icon: "\u2699\uFE0F", external: true },
];

export default function ClubNavigation(
  { status = null, controlRoomUrl = CONTROL_ROOM_FALLBACK_URL, activeLabel = "Dashboard" }:
    { status?: React.ReactNode; controlRoomUrl?: string; activeLabel?: string },
) {
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
            {item.href || item.external ? (
              <a
                href={item.external ? controlRoomUrl : item.href}
                {...(item.external
                  ? { target: "_blank", rel: "noopener noreferrer", title: "Edit the board's Notion tables" }
                  : item.label === activeLabel ? { "aria-current": "page" as const } : {})}
                className={`${styles.clubNavItem} ${item.label === activeLabel ? styles.clubNavItemActive : ""}`}
                data-testid="club-nav-item"
              >
                <span aria-hidden="true" className={styles.clubNavIcon}>{item.icon}</span>
                <span data-testid="club-nav-label">{item.label}</span>
              </a>
            ) : (
              <span
                aria-disabled="true"
                title="Coming in a later ANSAR OS stage"
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
