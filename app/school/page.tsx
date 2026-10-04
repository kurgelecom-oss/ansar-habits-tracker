"use client";

import { useEffect, useMemo, useState } from "react";
import ClubNavigation from "../components/dashboard/ClubNavigation";
import styles from "./school.module.css";

/* ════════════════════════════════════════════════════════════════════════════
   /school — the academy.

   Football has fourteen routes of its own. School had none: it was a divider
   inside a card inside a column of a football dashboard, and five hours a day
   lived behind one checkbox. This is its own address.

   Three views, all from data the system already holds:
     Today      the day's blocks, each with its REAL task text on the row, and
                each one tickable on its own (Phase 1's record).
     This week  Monday to Friday. A homeschooled child could not see his own
                week before this screen.
     The year   the term arc, from the Week label Notion already carries.

   NOTHING IS REMOVED FROM THE DASHBOARD BY THIS PHASE. The proposal has the
   homeschool card shrinking to a summary here, but the phase gate is "every
   habit configured in Notion still appears somewhere". Shrinking the card and
   adding this screen in one change would make that impossible to verify, so
   the card stays and Phase 4 moves it.
   ══════════════════════════════════════════════════════════════════════════ */

type Block = { rowId: string; label: string; duration: string | null; task: string; guide: string[]; done: boolean };
type Day = { date: string; weekday: string; dayTopic: string; note: string; isToday: boolean; blocks: Block[] };
type Week = {
  weekStart: string; weekEnd: string; today: string; configured: boolean;
  weekTitle: string; syncedAt?: string | null; days: Day[]; upcoming?: boolean;
  totals?: { blocks: number; done: number }; message?: string;
};

const VIEWS = ["Today", "This week", "The year"] as const;
type View = typeof VIEWS[number];

/** "Term 4 — Week 1 (5–9 Oct)" → { term: 4, week: 1 }. Best effort: the Week
 *  column is free text, so anything unparseable degrades to nulls rather than
 *  inventing a position in a term. Phase 1 of the inventory marked this
 *  REBUILD precisely because it is a sentence, not structure. */
function parseArc(weekTitle: string): { term: number | null; week: number | null } {
  const term = /term\s*(\d+)/i.exec(weekTitle);
  const week = /week\s*(\d+)/i.exec(weekTitle);
  return { term: term ? Number(term[1]) : null, week: week ? Number(week[1]) : null };
}

export default function SchoolPage() {
  const [view, setView] = useState<View>("Today");
  const [week, setWeek] = useState<Week | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/school-week", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setWeek(await r.json());
      setState("ready");
    } catch {
      setState("unavailable");
    }
  }

  useEffect(() => { load(); }, []);

  const today = useMemo(
    () => week?.days.find(d => d.isToday) ?? null,
    [week],
  );

  async function tick(rowId: string) {
    setBusy(rowId);
    setError(null);
    try {
      const r = await fetch("/api/school-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowId }),
      });
      const body = await r.json();
      if (!r.ok || !body.ok) {
        // The server owns the rules. Say what it said rather than guessing.
        setError(body.message ?? "That block could not be recorded.");
      } else {
        await load();
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  const arc = parseArc(week?.weekTitle ?? "");

  return (
    <>
      <ClubNavigation activeLabel="School" />
      <main className={styles.page}>
       <div className={styles.content}>
        <header>
          <p className={styles.kicker}>Ansar OS · School</p>
          <h1 className={styles.title}>{week?.weekTitle || "School"}</h1>
          <p className={styles.sub}>
            {state === "loading" ? "Loading…"
              : state === "unavailable" ? "The week could not be loaded."
              : week?.upcoming
                ? `Next week · ${week?.totals?.blocks ?? 0} blocks planned`
                : `${week?.totals?.done ?? 0} of ${week?.totals?.blocks ?? 0} blocks done this week`}
          </p>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="School views">
          {VIEWS.map(v => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              className={`${styles.tab} ${view === v ? styles.tabOn : ""}`}
              onClick={() => setView(v)}
            >{v}</button>
          ))}
        </div>

        {error ? <p className={styles.warn}>{error}</p> : null}

        {state === "ready" && week && !week.configured ? (
          <p className={styles.warn}>
            The stored programme is unavailable, so this screen has nothing to show.
            {week.message ? ` (${week.message})` : ""}
          </p>
        ) : null}

        {/* ── TODAY ─────────────────────────────────────────────────────── */}
        {view === "Today" ? (
          <section className={styles.card}>
            {!today ? (
              <p className={styles.empty}>
                No school day today. The week runs Monday to Friday.
              </p>
            ) : (
              <>
                <div className={styles.cardHead}>
                  <h2 className={styles.cardTitle}>
                    {today.weekday} — {today.dayTopic || "No day topic"}
                  </h2>
                  <span className={styles.cardMeta}>
                    {today.blocks.filter(b => b.done).length} of {today.blocks.length} done
                  </span>
                </div>
                {today.note ? <p className={styles.note}>{today.note}</p> : null}
                {today.blocks.length === 0 ? (
                  <p className={styles.empty}>No blocks are loaded for today.</p>
                ) : today.blocks.map(b => (
                  <div key={b.rowId} className={`${styles.block} ${b.done ? styles.blockDone : ""}`}>
                    <button
                      className={`${styles.tickBtn} ${b.done ? styles.tickOn : ""}`}
                      onClick={() => tick(b.rowId)}
                      disabled={busy === b.rowId || b.done}
                      aria-label={b.done ? `${b.label} done` : `Mark ${b.label} done`}
                    >{b.done ? "✓" : busy === b.rowId ? "…" : ""}</button>
                    <div className={styles.blockBody}>
                      <div className={styles.blockLabel}>
                        {b.label}
                        {b.duration ? <span className={styles.blockDur}>{b.duration}</span> : null}
                      </div>
                      {/* The whole point: the task is here, not behind a tap. */}
                      <p className={styles.blockTask}>{b.task}</p>
                      {b.guide.length ? (
                        <ul className={styles.guide}>
                          {b.guide.slice(0, 3).map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>
        ) : null}

        {/* ── THIS WEEK ─────────────────────────────────────────────────── */}
        {view === "This week" ? (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>{week?.upcoming ? "Next week, Monday to Friday" : "Monday to Friday"}</h2>
              <span className={styles.cardMeta}>
                {week?.weekStart} – {week?.weekEnd}
              </span>
            </div>
            <div className={styles.weekGrid}>
              {(week?.days ?? []).map(d => (
                <div key={d.date} className={`${styles.dayCol} ${d.isToday ? styles.dayColToday : ""}`}>
                  <p className={styles.dayName}>{d.weekday}</p>
                  <p className={styles.dayDate}>
                    {d.date}{d.isToday ? " · today" : ""}
                  </p>
                  <p className={styles.dayTopic}>{d.dayTopic || "—"}</p>
                  {d.blocks.length === 0
                    ? <span className={styles.chip}>No blocks</span>
                    : d.blocks.map(b => (
                        <span key={b.rowId} className={`${styles.chip} ${b.done ? styles.chipDone : ""}`}>
                          {b.done ? "✓ " : ""}{b.label}
                        </span>
                      ))}
                </div>
              ))}
            </div>
            {week?.syncedAt ? (
              <p className={styles.note}>
                Stored copy, refreshed nightly. Last synced {new Date(week.syncedAt).toLocaleString("en-AU")}.
                A week edited in Notion today appears here after tonight&apos;s sync.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* ── THE YEAR ──────────────────────────────────────────────────── */}
        {view === "The year" ? (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>
                {arc.term ? `Term ${arc.term}` : "The year"}
              </h2>
              <span className={styles.cardMeta}>
                {arc.week ? `Week ${arc.week} of 10` : "Week not numbered"}
              </span>
            </div>
            {arc.week !== null ? (
              <>
                <div className={styles.arc} aria-label={`Week ${arc.week} of 10`}>
                  {Array.from({ length: 10 }, (_, i) => {
                    const w = arc.week as number;
                    return (
                      <span
                        key={i}
                        className={`${styles.arcCell} ${
                          i + 1 === w ? styles.arcNow : i + 1 < w ? styles.arcCellOn : ""
                        }`}
                      />
                    );
                  })}
                </div>
                <p className={styles.note}>
                  You are here — week {arc.week} of a ten-week term.
                </p>
              </>
            ) : (
              <p className={styles.empty}>
                No term position is recorded. The Week column in Notion is free text
                (&ldquo;{week?.weekTitle || "empty"}&rdquo;), so it cannot be placed in a term
                until it becomes a real field.
              </p>
            )}
            <p className={styles.note}>
              Year level, curriculum and year goals are not yet recorded anywhere in the
              system. The school inventory marks all five as REBUILD; nothing is invented here.
            </p>
          </section>
        ) : null}
       </div>
      </main>
    </>
  );
}
