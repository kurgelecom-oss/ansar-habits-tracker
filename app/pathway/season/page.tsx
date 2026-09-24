import Link from "next/link";
import { PageHero } from "../components/ui";
import { MONTH_FOCUS, YEAR_GOALS, YEAR_PHASES } from "../data/scouts";
import { WEEK, formatTime } from "../data/week";
import { drillById } from "../data/drills";
import styles from "../pathway.module.css";

export const dynamic = "force-dynamic";

const PHASE_FOR_MONTH = ["Off-season", "Pre-season", "Pre-season", "Season", "Season", "Season", "Season", "Season", "Finals & review", "Trials & transition", "Trials & transition", "Off-season"];

export default function SeasonPage() {
  const monthIdx = Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", month: "numeric" }).format(new Date())) - 1;
  const nowPhase = PHASE_FOR_MONTH[monthIdx];
  const nowMonth = MONTH_FOCUS[monthIdx].month;
  return (
    <>
      <PageHero kicker="📅 Day · Week · Month · Year" title="The long game, one day at a time" lead="The year has a shape. Each month has one focus. Each week has one rhythm. Each day has one main session — after homeschool, never instead of it." />
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>🏆 The year&apos;s goals</h2></div>
        <div className={styles.grid3}>{YEAR_GOALS.map(g => <div key={g.goal} className={styles.card}><h3>{g.icon} {g.goal}</h3><span className={`${styles.pill} ${styles.pillLime}`}>{g.measure}</span></div>)}</div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>The season</h2><span className={styles.muted}>You are here: <b style={{ color: "var(--pw-lime)" }}>{nowPhase}</b></span></div>
        <div className={styles.phaseRow}>{YEAR_PHASES.map(p => <div key={p.name} className={`${styles.phase} ${p.name === nowPhase ? styles.phaseNow : ""}`}><b>{p.icon} {p.name}</b><div className={styles.small} style={{ color: "var(--pw-gold)", margin: "4px 0" }}>{p.months}</div><div className={`${styles.small} ${styles.muted}`}>{p.aim}</div></div>)}</div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>Monthly focus</h2></div>
        <div className={styles.monthGrid}>{MONTH_FOCUS.map(m => { const d = drillById(m.drill); return <div key={m.month} className={`${styles.month} ${m.month === nowMonth ? styles.monthNow : ""}`}><b>{m.month}</b>{m.focus}{d ? <div><Link href={`/pathway/drills#${d.id}`} style={{ color: "var(--pw-lime)" }}>{d.name} →</Link></div> : null}</div>; })}</div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>The week</h2></div>
        <div className={styles.card} style={{ overflowX: "auto" }}>
          <table className={styles.weekTable}>
            <thead><tr><th>Day</th><th>Theme</th><th>Sessions</th><th>Treat</th></tr></thead>
            <tbody>{WEEK.map(d => <tr key={d.day}><td><b>{d.day}</b></td><td>{d.theme}</td><td>{d.sessions.map(s => <div key={s.id}>{formatTime(s.start)} {s.icon} {s.title}</div>)}</td><td>{d.treatWindow ? "🍕" : "—"}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>A school day</h2></div>
        <div className={styles.card}>
          <ul className={styles.list}>
            <li><b>6:45</b> Feet on the floor, Fajr, bed made</li>
            <li><b>6:50</b> 🌅 Dawn Touches — 20 min with the ball</li>
            <li><b>7:30</b> Breakfast, no screens</li>
            <li><b>8:30–1:30</b> 📚 Homeschool. Football waits.</li>
            <li><b>1:30</b> Lunch — the main fuel for the afternoon</li>
            <li><b>3:45</b> ⚽ The day&apos;s one main session</li>
            <li><b>5:30</b> 🏟️ Club training (Mon + Wed)</li>
            <li><b>8:00</b> Screens off · 🌙 <b>9:00</b> lights out</li>
          </ul>
        </div>
      </section>
    </>
  );
}
