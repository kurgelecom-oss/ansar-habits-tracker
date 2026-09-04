"use client";

import { useEffect, useMemo, useState } from "react";
import ClubNavigation from "../components/dashboard/ClubNavigation";
import { addDays, sydneyDateKey } from "../lib/time";
import styles from "./progress.module.css";

type Habit = { id: string; name: string; days: string[]; pointType: string };
type Completion = { habit_id: string; completed_date: string };
type Day = { date: string; done: number; planned: number };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function plannedForDay(habits: Habit[], date: string) {
  const name = WEEKDAY_NAMES[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return habits.filter(h => h.pointType !== "prerequisite" && (h.days.includes("Everyday") || h.days.includes(name))).length;
}

export default function ProgressPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    const today = sydneyDateKey();
    const start = addDays(today, -27);
    Promise.all([
      fetch("/api/habits", { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject()),
      // Importing the browser client inside the effect is deliberate: public
      // Supabase variables exist in the deployed browser, but are not present
      // while Next statically renders this route during a credential-free build.
      import("../lib/supabase").then(({ supabase }) => supabase.from("habit_completions").select("habit_id, completed_date").gte("completed_date", start).lte("completed_date", today)),
    ]).then(([roster, result]) => {
      if (result.error) throw result.error;
      setHabits(roster);
      setCompletions(result.data ?? []);
      setState("ready");
    }).catch(() => setState("unavailable"));
  }, []);

  const days = useMemo<Day[]>(() => {
    if (!habits.length) return [];
    const today = sydneyDateKey();
    return Array.from({ length: 28 }, (_, index) => {
      const date = addDays(today, index - 27);
      const planned = plannedForDay(habits, date);
      const done = new Set(completions.filter(c => c.completed_date === date).map(c => c.habit_id)).size;
      return { date, planned, done: Math.min(done, planned) };
    });
  }, [habits, completions]);
  const last7 = days.slice(-7);
  const completed = days.reduce((total, day) => total + day.done, 0);
  const planned = days.reduce((total, day) => total + day.planned, 0);
  const rate = planned ? Math.round(completed / planned * 100) : 0;
  const best = Math.max(0, ...days.map(day => day.planned ? Math.round(day.done / day.planned * 100) : 0));

  return (
    <main className={styles.page} aria-label="ANSAR OS Progress">
      <ClubNavigation activeLabel="Progress" />
      <section className={styles.content}>
        <header className={styles.heading}>
          <div><p className={styles.kicker}>ANSAR OS</p><h1>Progress</h1><p>What has actually been completed — not a guessed score.</p></div>
          <span className={styles.period}>Last 28 days</span>
        </header>
        {state === "loading" ? <p className={styles.message}>Loading your training record…</p> : null}
        {state === "unavailable" ? <p className={styles.message}>Progress is unavailable right now. The habit record could not be reached.</p> : null}
        {state === "ready" ? <>
          <div className={styles.metrics}>
            <article><strong>{rate}%</strong><span>completion rate</span></article>
            <article><strong>{completed}</strong><span>habits completed</span></article>
            <article><strong>{best}%</strong><span>best day</span></article>
          </div>
          <section className={styles.chart} aria-label="Daily completion rate over the last seven days">
            <div className={styles.chartTitle}><h2>This week</h2><span>Each bar is the share of planned habits completed</span></div>
            <div className={styles.bars}>
              {last7.map(day => {
                const percent = day.planned ? Math.round(day.done / day.planned * 100) : 0;
                return <div className={styles.barGroup} key={day.date}><span>{percent}%</span><div className={styles.track}><i style={{ height: `${percent}%` }} /></div><b>{DAYS[new Date(`${day.date}T12:00:00Z`).getUTCDay()]}</b></div>;
              })}
            </div>
          </section>
          <section className={styles.breakdown}><h2>Four-week record</h2><div className={styles.weekGrid}>{[0, 1, 2, 3].map(week => { const record = days.slice(week * 7, week * 7 + 7); const done = record.reduce((n, d) => n + d.done, 0); const total = record.reduce((n, d) => n + d.planned, 0); const percent = total ? Math.round(done / total * 100) : 0; return <article key={week}><span>Week {week + 1}</span><strong>{percent}%</strong><div><i style={{ width: `${percent}%` }} /></div><small>{done} of {total} planned habits</small></article>; })}</div></section>
        </> : null}
      </section>
    </main>
  );
}
