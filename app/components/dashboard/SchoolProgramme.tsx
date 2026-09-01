"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./dashboard.module.css";

/**
 * TODAY'S LESSONS — the subjects, in the live week page's order.
 *
 * Read-only, and deliberately so. This lists what Ansar is learning today; the
 * ticking, gating and scoring next to it belong to the Notion Habit Blocks and
 * are untouched by anything here. Nothing in this file can complete a habit,
 * move a point, or change a window.
 *
 * It fetches its own data rather than being handed it by page.tsx. The board's
 * other four sources are all gate inputs and have to be resolved together
 * before a row can render its state; this one decides nothing, so coupling it
 * into that load would make a Notion week-page outage able to delay the tick
 * path. A failure here shows a line of text and leaves the rest of the board
 * exactly as it was.
 *
 * The pop-up is sized to 92vw × 80vh, capped at 900px, which lands at roughly
 * 70–80% of the screen on both a phone and a laptop — big enough that the
 * explainer is the only thing being read, without becoming a second page.
 */

type Subject = { id: string; name: string; duration: string | null; detail: string };

type SchoolDay = {
  ok: boolean;
  weekTitle: string;
  weekUrl: string | null;
  dayLabel: string;
  weekday: string;
  date: string;
  subjects: Subject[];
  stale: boolean;
  message: string | null;
};

export default function SchoolProgramme({ day = null }: { day?: string | null }) {
  const [data, setData] = useState<SchoolDay | null>(null);
  const [open, setOpen] = useState<Subject | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let live = true;
    const url = day ? `/api/homeschool?day=${encodeURIComponent(day)}` : "/api/homeschool";
    fetch(url)
      .then(r => r.json())
      .then(d => { if (live) setData(d as SchoolDay); })
      // The board keeps working without lessons. A thrown fetch leaves `data`
      // null, which renders nothing at all rather than an error card.
      .catch(() => {});
    return () => { live = false; };
  }, [day]);

  const close = useCallback(() => setOpen(null), []);

  // Escape closes, and the close button takes focus on open, so the sheet is
  // reachable and dismissable without a pointer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!data) return null;

  const heading = data.dayLabel || `${data.weekday} — lessons`;

  return (
    <section
      data-testid="school-programme"
      className={styles.programmeSection}
      aria-label="Today's lessons"
    >
      <h3 className={styles.programmeSectionTitle}>📘 Today&apos;s lessons</h3>

      {data.stale && (
        <p data-testid="school-stale" className={styles.schoolNote}>
          {data.message}
        </p>
      )}

      {data.subjects.length === 0 ? (
        <p className={styles.schoolNote}>{data.message ?? "Nothing scheduled."}</p>
      ) : (
        <>
          <p className={styles.schoolDay}>{heading}</p>
          <ol className={styles.schoolList}>
            {data.subjects.map((subject, i) => (
              <li key={subject.id}>
                <button
                  type="button"
                  data-testid={`school-subject-${subject.id}`}
                  className={styles.schoolRow}
                  onClick={() => setOpen(subject)}
                  aria-haspopup="dialog"
                >
                  <span className={styles.schoolIndex}>{i + 1}</span>
                  <span className={styles.schoolName}>{subject.name}</span>
                  {subject.duration && (
                    <span className={styles.schoolDuration}>{subject.duration}</span>
                  )}
                  <span aria-hidden className={styles.schoolChevron}>›</span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}

      {open && (
        <div
          className={styles.sheetBackdrop}
          data-testid="school-sheet"
          onClick={close}
        >
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label={open.name}
            // The backdrop closes; the sheet itself must not, or every tap on
            // the text being read would dismiss the thing being read.
            onClick={e => e.stopPropagation()}
          >
            <header className={styles.sheetHead}>
              <div className={styles.sheetHeadText}>
                <h2 className={styles.sheetTitle}>{open.name}</h2>
                <p className={styles.sheetMeta}>
                  {heading}{open.duration ? ` · ${open.duration}` : ""}
                </p>
              </div>
              <button
                type="button"
                ref={closeRef}
                className={styles.sheetClose}
                onClick={close}
                aria-label="Close"
              >
                ✕
              </button>
            </header>

            <div className={styles.sheetBody}>
              <p className={styles.sheetDetail}>{open.detail}</p>
            </div>

            <footer className={styles.sheetFoot}>
              {data.weekUrl && (
                <a
                  className={styles.sheetLink}
                  href={data.weekUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open the full week in Notion
                </a>
              )}
              <button type="button" className={styles.sheetDone} onClick={close}>
                Got it
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
