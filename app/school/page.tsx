"use client";

import { useEffect, useMemo, useState } from "react";
import ClubNavigation from "../components/dashboard/ClubNavigation";
import styles from "./school.module.css";
import { TERM, TRACKED, TRACKING_FROM_WEEK, WEEKLY_PROOF, TERM_TARGETS, YEAR6_GOALS, YEAR_LEVEL, type Area, type ProofState } from "./data/year";

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
     The year   the term week by week: each subject's weekly proof, what is
                coming up, the end-of-term targets and the Year 6 goals.

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

type YearWeek = {
  n: number; start: string; end: string; unit: string; history: string; maths: string; milestones: string[];
  topics: string[]; review: ProofState; proofs: Record<Area, { planned: number; done: number; state: ProofState }>;
};
type Year = { today: string; currentWeek: number; configured: boolean; weeks: YearWeek[]; message?: string };

const MARK: Record<ProofState, string> = { done: "✅", partial: "◐", due: "⏳", missed: "✗", upcoming: "○", none: "" };
const SAY: Record<ProofState, string> = { done: "done", partial: "part done", due: "due this week", missed: "not done", upcoming: "coming", none: "not tracked (Week 1)" };
const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

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

  const [year, setYear] = useState<Year | null>(null);
  useEffect(() => {
    if (view !== "The year" || year) return;
    fetch("/api/school-year", { cache: "no-store" }).then(r => r.json()).then(setYear).catch(() => setYear({ today: "", currentWeek: 0, configured: false, weeks: [] }));
  }, [view, year]);

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
        {view === "The year" ? <YearView year={year} /> : null}
       </div>
      </main>
    </>
  );
}

/** School → The year. Every week of the term, what each subject must show,
 *  what is coming up, the end-of-term targets and what Year 6 expects. */
function YearView({ year }: { year: Year | null }) {
  if (!year) return <section className={styles.card}><p className={styles.empty}>Loading the term…</p></section>;
  const now = year.weeks.find(w => w.n === year.currentWeek) ?? null;
  const next = year.weeks.find(w => w.n === year.currentWeek + 1) ?? null;
  const area = (a: Area) => a === "HASS" ? "History" : a;
  const count = (a: Area) => year.weeks.filter(w => w.proofs[a]?.state === "done").length;
  const planned = (a: Area) => year.weeks.filter(w => w.n >= TRACKING_FROM_WEEK && (w.proofs[a]?.planned ?? 0) > 0).length;
  return (
    <>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>{TERM.name}</h2>
          <span className={styles.cardMeta}>
            {now ? `Week ${now.n} of ${TERM.weeks}` : year.currentWeek > TERM.weeks ? "Term finished" : "Term not started"}
          </span>
        </div>
        <ol className={styles.term} aria-label={`Week ${year.currentWeek} of ${TERM.weeks}`}>
          {year.weeks.map(w => (
            <li key={w.n} className={`${styles.termWeek} ${w.n === year.currentWeek ? styles.termNow : w.n < year.currentWeek ? styles.termPast : ""}`}>
              <span className={styles.termN}>W{w.n}</span>
              <span className={styles.termUnit}>{w.unit}</span>
              <span className={styles.termDate}>{shortDate(w.start)}</span>
            </li>
          ))}
        </ol>
        <p className={styles.note}>{TERM.endLabel}. {!year.configured ? "Progress could not be loaded, so the ticks below are blank." : ""}</p>
      </section>

      {now ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>This week: {now.unit}</h2>
            <span className={styles.cardMeta}>{shortDate(now.start)} – {shortDate(now.end)}</span>
          </div>
          <p className={styles.note}>{now.history} · Maths: {now.maths}</p>
          <ul className={styles.proofs}>
            {TRACKED.map(a => {
              const p = now.proofs[a];
              if (!p?.planned) return null;
              return (
                <li key={a} className={styles.proof}>
                  <span className={styles.proofMark} aria-hidden>{MARK[p.state]}</span>
                  <span><b>{area(a)}</b> · {WEEKLY_PROOF[a]}</span>
                  <span className={styles.proofState}>{p.done} of {p.planned} blocks · {SAY[p.state]}</span>
                </li>
              );
            })}
            <li className={styles.proof}>
              <span className={styles.proofMark} aria-hidden>⚽</span>
              <span><b>Health &amp; PE</b> · {WEEKLY_PROOF["Health & PE"]}</span>
              <a className={styles.proofState} href="/pathway">Football pathway</a>
            </li>
            <li className={styles.proof}>
              <span className={styles.proofMark} aria-hidden>{MARK[now.review]}</span>
              <span><b>Friday review</b> · handed in</span>
              <span className={styles.proofState}>{SAY[now.review]}</span>
            </li>
          </ul>
        </section>
      ) : null}

      <section className={styles.card}>
        <div className={styles.cardHead}><h2 className={styles.cardTitle}>Coming up</h2></div>
        <ul className={styles.coming}>
          {[now, next].filter((w): w is YearWeek => !!w).flatMap(w => w.milestones.map(m => <li key={`${w.n}-${m}`}>{m}</li>))}
          {next ? <li>Next week (W{next.n}, {shortDate(next.start)}): <b>{next.unit}</b>, {next.history}. Maths: {next.maths}.</li> : null}
          {year.weeks.filter(w => w.n > year.currentWeek + 1).flatMap(w => w.milestones.map(m => <li key={`${w.n}-${m}`} className={styles.later}>{m}</li>))}
        </ul>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>End of term targets</h2>
          <span className={styles.cardMeta}>{TERM.endLabel}</span>
        </div>
        <ul className={styles.proofs}>
          {(Object.keys(TERM_TARGETS) as Area[]).map(a => (
            <li key={a} className={styles.proof}>
              <span><b>{area(a)}</b> · {TERM_TARGETS[a]}</span>
              {TRACKED.includes(a) ? <span className={styles.proofState}>{count(a)} of {planned(a)} weeks</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Year {YEAR_LEVEL} goals</h2>
          <span className={styles.cardMeta}>Australian Curriculum v9</span>
        </div>
        <dl className={styles.goals}>
          {(Object.keys(YEAR6_GOALS) as Area[]).map(a => (
            <div key={a}><dt>{area(a)}</dt><dd>{YEAR6_GOALS[a]}</dd></div>
          ))}
        </dl>
      </section>
    </>
  );
}
