"use client";
import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";

/**
 * WHICH WEEK THE BOARD IS RUNNING — read from Notion, never typed here.
 *
 * The label is the `Week` column of 📆 2 · Daily Programme, carried out of
 * /api/homeschool as `weekTitle`. Loading a new week into that table (step 2
 * of the Friday job) is therefore the only thing that changes this badge; there
 * is no week number anywhere in this repo to forget to bump.
 *
 * Three states, and each one says what it is:
 *  - current  → the week label, linked to the week page when table 1 has one
 *  - stale    → the same label, amber, prefixed "Old week" — the rows are more
 *               than 7 days old, so step 2 was skipped
 *  - none     → "No week loaded" — the table has no active rows for today
 *
 * Self-fetching, like SchoolProgramme, and for the same reason: this decides
 * nothing. A Notion outage here must not be able to delay the tick path, so it
 * is not coupled into page.tsx's gate load. A failed fetch renders nothing.
 */
type WeekInfo = {
  weekTitle: string;
  weekUrl: string | null;
  stale: boolean;
  subjects: unknown[];
};

export default function WeekBadge() {
  const [info, setInfo] = useState<WeekInfo | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/homeschool")
      .then(r => r.json())
      .then(d => { if (live) setInfo(d as WeekInfo); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  if (!info) return null;

  const loaded = Boolean(info.weekTitle) || info.subjects.length > 0;
  const label = info.weekTitle || "Week not named";

  if (!loaded) {
    return (
      <span
        className={`${styles.weekBadge} ${styles.weekBadgeEmpty}`}
        data-testid="week-badge"
        data-state="none"
        title="📆 2 · Daily Programme has no active rows for today — load the week into the Control Room"
      >
        <span aria-hidden="true">📆</span> No week loaded
      </span>
    );
  }

  const cls = `${styles.weekBadge} ${info.stale ? styles.weekBadgeStale : ""}`;
  const text = info.stale ? `Old week · ${label}` : label;
  const title = info.stale
    ? "These rows are more than 7 days old. Load the new week into 📆 2 · Daily Programme."
    : "The week the board is running, from 📆 2 · Daily Programme. Opens the week page.";

  return info.weekUrl ? (
    <a
      className={cls}
      href={info.weekUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="week-badge"
      data-state={info.stale ? "stale" : "current"}
      title={title}
    >
      <span aria-hidden="true">📆</span> {text}
    </a>
  ) : (
    <span
      className={cls}
      data-testid="week-badge"
      data-state={info.stale ? "stale" : "current"}
      title={title}
    >
      <span aria-hidden="true">📆</span> {text}
    </span>
  );
}
