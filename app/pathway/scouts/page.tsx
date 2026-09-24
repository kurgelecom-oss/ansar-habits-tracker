import { Benchmarks } from "../components/features";
import { PageHero } from "../components/ui";
import { FOUR_CORNERS, LADDER_NOTE, PATHWAY_LADDER, RED_CARDS_FOR_SCOUTS } from "../data/scouts";
import styles from "../pathway.module.css";

export default function ScoutsPage() {
  return (
    <>
      <PageHero kicker="🔭 Scout's Eye" title="What coaches are really looking for" lead="At 12 you are in Football Australia's Skill Acquisition Phase (ages 9–13): master the ball, win 1v1s, strike cleanly, first touch. Coaches judge five corners — and size is not one of them." />
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>The five corners</h2></div>
        <div className={styles.grid3}>
          {FOUR_CORNERS.map(c => <div key={c.name} className={styles.card}><h3>{c.icon} {c.name}</h3><ul className={styles.list}>{c.lookFor.map(x => <li key={x}>{x}</li>)}</ul></div>)}
          <div className={`${styles.card} ${styles.redFlag}`}><h3>🟥 What gets you cut</h3><ul className={styles.list}>{RED_CARDS_FOR_SCOUTS.map(x => <li key={x}>{x}</li>)}</ul></div>
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>Your test day</h2><span className={styles.muted}>Test on the last Saturday of the month</span></div>
        <div className={styles.card}>
          <p className={styles.muted} style={{ marginTop: 0 }}>These are YOUR starting targets, not national averages. Beat your own best every month — that&apos;s the only comparison that counts at 12.</p>
          <Benchmarks />
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>The ladder in Sydney</h2></div>
        <div className={styles.ladder}>
          {PATHWAY_LADDER.map(r => <div key={r.name} className={styles.rung}><i aria-hidden="true">{r.icon}</i><div><b>{r.name}</b><div className={styles.muted}>{r.what}</div><span className={`${styles.pill} ${styles.pillGold}`} style={{ marginTop: 6 }}>{r.when}</span></div></div>)}
        </div>
        <p className={styles.footerNote}>{LADDER_NOTE}</p>
      </section>
    </>
  );
}
