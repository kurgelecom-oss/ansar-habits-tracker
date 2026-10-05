import { notFound } from "next/navigation";
import { getZone } from "../../data";
import { ZoneBenchmarks, ZoneHero } from "../../components/ui";
import styles from "../../../pathway/pathway.module.css";

export default async function TestsPage({ params }: { params: Promise<{ zone: string }> }) {
  const os = getZone((await params).zone);
  if (!os) notFound();
  return (
    <>
      <ZoneHero mark={os.icon} kicker="🔭 Test day" title={os.experts.title} lead={os.experts.lead} />
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>What they look for</h2></div>
        <div className={styles.grid3}>
          {os.experts.corners.map(c => <div key={c.name} className={styles.card}><h3>{c.icon} {c.name}</h3><ul className={styles.list}>{c.lookFor.map(x => <li key={x}>{x}</li>)}</ul></div>)}
          <div className={`${styles.card} ${styles.redFlag}`}><h3>🟥 What holds you back</h3><ul className={styles.list}>{os.experts.redCards.map(x => <li key={x}>{x}</li>)}</ul></div>
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>Your test day</h2><span className={styles.muted}>Test on the last Saturday of the month</span></div>
        <div className={styles.card}>
          <p className={styles.muted} style={{ marginTop: 0 }}>These are YOUR starting targets, not national averages. Beat your own best every month.</p>
          <ZoneBenchmarks zone={os.id} benchmarks={os.benchmarks} />
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>The long road</h2></div>
        <div className={styles.ladder}>
          {os.ladder.map(r => <div key={r.name} className={styles.rung}><i aria-hidden="true">{r.icon}</i><div><b>{r.name}</b><div className={styles.muted}>{r.what}</div><span className={`${styles.pill} ${styles.pillGold}`} style={{ marginTop: 6 }}>{r.when}</span></div></div>)}
        </div>
        <p className={styles.footerNote}>{os.ladderNote}</p>
      </section>
    </>
  );
}
