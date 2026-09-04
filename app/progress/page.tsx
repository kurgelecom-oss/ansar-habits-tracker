"use client";

import { useEffect, useMemo, useState } from "react";
import ClubNavigation from "../components/dashboard/ClubNavigation";
import { addDays, sydneyDateKey, weekStartOf } from "../lib/time";
import styles from "./progress.module.css";

type Habit = { id: string; name: string; days: string[]; pointType: string };
type Completion = { habit_id: string; completed_date: string };
type Day = { date: string; done: number; planned: number };
type WeekResult = { week_start: string; total_points: number; tier: string; perfect_week: boolean; partial: boolean };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const REPORT_FALLBACK_URL = "https://app.notion.com/p/625dde97436d4b5bbabbebdf9431afee?v=3be5429afa90818d80de000cf7a279e3";

function plannedForDay(habits: Habit[], date: string) {
  const name = WEEKDAY_NAMES[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return habits.filter(h => h.pointType !== "prerequisite" && (h.days.length === 0 || h.days.includes(name.slice(0, 3)))).length;
}

export default function ProgressPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [weekResults, setWeekResults] = useState<WeekResult[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("overview");
  const [reportUrl, setReportUrl] = useState(REPORT_FALLBACK_URL);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    const today = sydneyDateKey();
    const start = addDays(today, -83);
    Promise.all([
      fetch("/api/habits", { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject()),
      // Importing the browser client inside the effect is deliberate: public
      // Supabase variables exist in the deployed browser, but are not present
      // while Next statically renders this route during a credential-free build.
      import("../lib/supabase").then(async ({ supabase }) => {
        const [completions, weeks] = await Promise.all([
          supabase.from("habit_completions").select("habit_id, completed_date").gte("completed_date", start).lte("completed_date", today),
          supabase.from("week_results").select("week_start, total_points, tier, perfect_week, partial").gte("week_start", start).order("week_start", { ascending: false }),
        ]);
        if (completions.error) throw completions.error;
        return { completions: completions.data ?? [], weeks: weeks.data ?? [] };
      }),
      fetch("/api/settings").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([roster, result, settings]) => {
      setHabits(roster);
      setCompletions(result.completions);
      setWeekResults(result.weeks);
      if (settings?.links?.activeWeekPage) setReportUrl(settings.links.activeWeekPage);
      setState("ready");
    }).catch(() => setState("unavailable"));
  }, []);

  const days = useMemo<Day[]>(() => {
    if (!habits.length) return [];
    const today = sydneyDateKey();
    return Array.from({ length: 84 }, (_, index) => {
      const date = addDays(today, index - 83);
      const planned = plannedForDay(habits, date);
      const done = new Set(completions.filter(c => c.completed_date === date).map(c => c.habit_id)).size;
      return { date, planned, done: Math.min(done, planned) };
    });
  }, [habits, completions]);
  const weeks = [...new Set(days.map(day => weekStartOf(day.date)))].reverse();
  const activeDays = selectedWeek === "overview" ? days : days.filter(day => weekStartOf(day.date) === selectedWeek);
  const last7 = selectedWeek === "overview" ? days.slice(-7) : activeDays;
  const completed = activeDays.reduce((total, day) => total + day.done, 0);
  const planned = activeDays.reduce((total, day) => total + day.planned, 0);
  const rate = planned ? Math.round(completed / planned * 100) : 0;
  const best = Math.max(0, ...activeDays.map(day => day.planned ? Math.round(day.done / day.planned * 100) : 0));
  const activeResult = weekResults.find(week => week.week_start === selectedWeek);

  return (
    <main className={styles.page} aria-label="ANSAR OS Progress">
      <ClubNavigation activeLabel="Progress" />
      <section className={styles.content}>
        <header className={styles.heading}>
          <div><p className={styles.kicker}>ANSAR OS</p><h1>Progress</h1><p>What has actually been completed — not a guessed score.</p></div>
          <a className={styles.period} href={reportUrl} target="_blank" rel="noreferrer">Open weekly report in Notion</a>
        </header>
        {state === "loading" ? <p className={styles.message}>Loading your training record…</p> : null}
        {state === "unavailable" ? <p className={styles.message}>Progress is unavailable right now. The habit record could not be reached.</p> : null}
        {state === "ready" ? <>
          <div className={styles.metrics}>
            <article><strong>{rate}%</strong><span>{selectedWeek === "overview" ? "12-week completion rate" : "completion rate"}</span></article>
            <article><strong>{completed}</strong><span>habits completed</span></article>
            <article><strong>{activeResult ? `${activeResult.total_points}/55` : `${best}%`}</strong><span>{activeResult ? `${activeResult.tier} week` : "best day"}</span></article>
          </div>
          <nav className={styles.weekTabs} aria-label="Progress period">
            <button className={selectedWeek === "overview" ? styles.selectedTab : ""} onClick={() => setSelectedWeek("overview")}>Full record</button>
            {weeks.map(week => <button key={week} className={selectedWeek === week ? styles.selectedTab : ""} onClick={() => setSelectedWeek(week)}>Week of {week.slice(5)}</button>)}
          </nav>
          <section className={styles.chart} aria-label="Daily completion rate over the last seven days">
            <div className={styles.chartTitle}><h2>{selectedWeek === "overview" ? "This week" : `Week of ${selectedWeek}`}</h2><span>Each bar is the share of planned habits completed</span></div>
            <div className={styles.bars}>
              {last7.map(day => {
                const percent = day.planned ? Math.round(day.done / day.planned * 100) : 0;
                return <div className={styles.barGroup} key={day.date}><span>{percent}%</span><div className={styles.track}><i style={{ height: `${percent}%` }} /></div><b>{DAYS[new Date(`${day.date}T12:00:00Z`).getUTCDay()]}</b></div>;
              })}
            </div>
          </section>
          <section className={styles.breakdown}><h2>Compounding record</h2><div className={styles.weekGrid}>{weeks.slice(0, 8).reverse().map(week => { const record = days.filter(day => weekStartOf(day.date) === week); const done = record.reduce((n, d) => n + d.done, 0); const total = record.reduce((n, d) => n + d.planned, 0); const percent = total ? Math.round(done / total * 100) : 0; const score = weekResults.find(row => row.week_start === week); return <article key={week}><span>Week of {week.slice(5)}</span><strong>{score ? `${score.total_points}/55` : `${percent}%`}</strong><div><i style={{ width: `${percent}%` }} /></div><small>{score ? `${score.tier}${score.partial ? " · partial" : ""}` : `${done} of ${total} planned habits`}</small></article>; })}</div></section>
        </> : null}
      </section>
    </main>
  );
}
