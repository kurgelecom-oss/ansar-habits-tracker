import Link from "next/link";
import { notFound } from "next/navigation";
import { getZone } from "../../data";
import { ZoneHero } from "../../components/ui";
import { formatTime } from "../../components/sections";
import styles from "../../../pathway/pathway.module.css";

export const dynamic = "force-dynamic";

export default async function SeasonPage({ params }: { params: Promise<{ zone: string }> }) {
  const os = getZone((await params).zone);
  if (!os) notFound();
  const monthIdx = Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", month: "numeric" }).format(new Date())) - 1;
  const nowPhase = os.season.phaseForMonth[monthIdx];
  const nowMonth = os.season.months[monthIdx]?.month;
  const item = (id?: string) => os.library.items.find(i => i.id === id);
  return (
    <>
      <ZoneHero mark={os.icon} kicker="📅 Day · Week · Month · Year" title="The long game, one day at a time" lead={`The year has a shape. Each month has one focus. Each week has one rhythm. ${os.shortName} fits around homeschool, never instead of it.`} />
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>🏆 The year&apos;s goals</h2></div>
        <div className={styles.grid3}>{os.season.goals.map(g => <div key={g.goal} className={styles.card}><h3>{g.icon} {g.goal}</h3><span className={`${styles.pill} ${styles.pillLime}`}>{g.measure}</span></div>)}</div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>The year</h2><span className={styles.muted}>You are here: <b style={{ color: "var(--pw-lime)" }}>{nowPhase}</b></span></div>
        <div className={styles.phaseRow}>{os.season.phases.map(p => <div key={p.name} className={`${styles.phase} ${p.name === nowPhase ? styles.phaseNow : ""}`}><b>{p.icon} {p.name}</b><div className={styles.small} style={{ color: "var(--pw-gold)", margin: "4px 0" }}>{p.months}</div><div className={`${styles.small} ${styles.muted}`}>{p.aim}</div></div>)}</div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>Monthly focus</h2></div>
        <div className={styles.monthGrid}>{os.season.months.map(m => { const i = item(m.libraryId); return <div key={m.month} className={`${styles.month} ${m.month === nowMonth ? styles.monthNow : ""}`}><b>{m.month}</b>{m.focus}{i ? <div><Link href={`/os/${os.id}/library#${i.id}`} style={{ color: "var(--pw-lime)" }}>{i.name} →</Link></div> : null}</div>; })}</div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>The week</h2></div>
        <div className={styles.card} style={{ overflowX: "auto" }}>
          <table className={styles.weekTable}>
            <thead><tr><th>Day</th><th>Theme</th><th>Sessions</th></tr></thead>
            <tbody>{os.week.map(d => <tr key={d.day}><td><b>{d.day}</b></td><td>{d.theme}</td><td>{d.sessions.length ? d.sessions.map(s => <div key={s.id}>{formatTime(s.start)} {s.icon} {s.title}</div>) : "Rest"}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
