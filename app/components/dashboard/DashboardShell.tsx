import type React from "react";
import ClubNavigation from "./ClubNavigation";
import styles from "./dashboard.module.css";

/**
 * The Dashboard V2 page frame: club navigation, then whatever the page renders.
 *
 * It is a labelled <main> so the board is one addressable landmark rather than
 * an unnamed div — the shared TopNav sits outside it, in the root layout, and
 * the two must not read as one region.
 */
export default function DashboardShell(
  { children, status = null, controlRoomUrl }:
    { children: React.ReactNode; status?: React.ReactNode; controlRoomUrl?: string },
) {
  return (
    <main className={styles.shell} aria-label="ANSAR FC Dashboard">
      {/* controlRoomUrl is passed straight through: the shell has no opinion
          about where the Notion back end lives, it just carries the value the
          page read from App Settings. Undefined until settings load, which is
          why ClubNavigation keeps a default rather than rendering nothing. */}
      <ClubNavigation status={status} controlRoomUrl={controlRoomUrl} />
      {children}
    </main>
  );
}
