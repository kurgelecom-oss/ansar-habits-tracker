import { PageHero } from "../components/ui";
import { SCREEN_RULES, WATCH_WORTH_IT, WATCH_ZERO_VALUE } from "../data/lifestyle";
import styles from "../pathway.module.css";

export default function ScreensPage() {
  return (
    <>
      <PageHero kicker="📺 Screens" title="Watch like a pro, not like a fan" lead="Pros watch football to steal ideas. Fans watch to pass time. You get the same screen time either way — this page decides what goes in it." />
      <div className={styles.grid2}>
        <section className={styles.card}><h2>✅ Worth it</h2>{WATCH_WORTH_IT.map(w => <div key={w.title} style={{ marginBottom: 14 }}><b>{w.icon} {w.title}</b><div className={styles.muted}>{w.why}</div>{w.how ? <div className={styles.small} style={{ color: "var(--pw-lime)", marginTop: 3 }}>How: {w.how}</div> : null}</div>)}</section>
        <section className={`${styles.card} ${styles.redFlag}`}><h2>⛔ Zero value</h2>{WATCH_ZERO_VALUE.map(w => <div key={w.title} style={{ marginBottom: 14 }}><b>{w.icon} {w.title}</b><div className={styles.muted}>{w.why}</div></div>)}</section>
      </div>
      <section className={`${styles.card} ${styles.section}`}><h2>The screen rules</h2><ul className={styles.list}>{SCREEN_RULES.map(r => <li key={r}>{r}</li>)}</ul></section>
    </>
  );
}
