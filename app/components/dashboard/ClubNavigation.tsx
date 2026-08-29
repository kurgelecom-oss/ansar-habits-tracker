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
const ITEMS: { label: string; href?: string }[] = [
  { label: "Dashboard", href: "/" },
  { label: "Habits" },
  { label: "Quests" },
  { label: "Team" },
  { label: "Table" },
  { label: "History" },
  { label: "Settings" },
];

export default function ClubNavigation() {
  return (
    <nav className={styles.clubNav} aria-label="ANSAR FC sections">
      <span className={styles.clubMark}>
        <span className={styles.clubCrest} aria-hidden="true" />
        <span className={styles.clubName}>ANSAR FC</span>
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
                {item.label}
              </a>
            ) : (
              <span
                aria-disabled="true"
                title="Coming later"
                className={`${styles.clubNavItem} ${styles.clubNavItemFuture}`}
                data-testid="club-nav-item"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
