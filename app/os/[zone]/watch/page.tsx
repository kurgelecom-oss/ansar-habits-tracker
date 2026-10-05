import { notFound } from "next/navigation";
import { getZone } from "../../data";
import { ZoneHero } from "../../components/ui";
import styles from "../../../pathway/pathway.module.css";

export default async function WatchPage({ params }: { params: Promise<{ zone: string }> }) {
  const os = getZone((await params).zone);
  if (!os) notFound();
  const w = os.watch;
  return (
    <>
      <ZoneHero mark={os.icon} kicker="📺 Watch" title="Watch like a pro, not like a fan" lead={w.lead} />
      <div className={styles.grid2}>
        <section className={styles.card}><h2>✅ Worth it</h2>{w.worthIt.map(x => <div key={x.title} style={{ marginBottom: 14 }}><b>{x.icon} {x.title}</b><div className={styles.muted}>{x.why}</div>{x.how ? <div className={styles.small} style={{ color: "var(--pw-lime)", marginTop: 3 }}>How: {x.how}</div> : null}</div>)}</section>
        <section className={`${styles.card} ${styles.redFlag}`}><h2>⛔ Zero value</h2>{w.zeroValue.map(x => <div key={x.title} style={{ marginBottom: 14 }}><b>{x.icon} {x.title}</b><div className={styles.muted}>{x.why}</div></div>)}</section>
      </div>
      <section className={`${styles.card} ${styles.section}`}><h2>The screen rules</h2><ul className={styles.list}>{w.rules.map(r => <li key={r}>{r}</li>)}</ul></section>
    </>
  );
}
