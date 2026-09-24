import type { Metadata } from "next";
import type { ReactNode } from "react";
import ClubNavigation from "../components/dashboard/ClubNavigation";
import { PathwayNav } from "./components/ui";
import styles from "./pathway.module.css";

export const metadata: Metadata = { title: "Football Pathway · ANSAR FC" };

export default function PathwayLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.shell} aria-label="ANSAR FC Football Pathway">
      <ClubNavigation activeLabel="Targets" />
      <PathwayNav />
      <div className={styles.content}>{children}</div>
    </main>
  );
}
