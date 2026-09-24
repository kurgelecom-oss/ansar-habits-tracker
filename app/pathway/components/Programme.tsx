import Link from "next/link";
import { programme, type Programme as P } from "../data/body";
import { PageHero } from "./ui";
import styles from "../pathway.module.css";

/** One page layout for Fitness, Conditioning and Strength. */
export default function Programme({ id }: { id: P["id"] }) {
  const p = programme(id);
  return (
    <>
      <PageHero kicker={`${p.icon} ${p.kicker}`} title={p.title} lead={p.intro} />
      <section className={`${styles.card}`}>
        <h2>The rules</h2>
        <ul className={styles.list}>{p.rules.map(r => <li key={r}>{r}</li>)}</ul>
      </section>
      {p.blocks.map(block => (
        <section key={block.name} className={`${styles.card} ${styles.section}`}>
          <p className={styles.kicker}>{block.when}</p>
          <h2>{block.name}</h2>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.exTable}>
              <thead><tr><th>Exercise</th><th>Dose</th><th>Coach says</th></tr></thead>
              <tbody>{block.items.map(ex => <tr key={ex.name}><td>{ex.name}</td><td>{ex.dose}</td><td className={styles.muted}>{ex.cue}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ))}
      <section className={`${styles.card} ${styles.section} ${styles.redFlag}`}>
        <h2>🚩 Stop and tell Mum if…</h2>
        <ul className={styles.list}>{p.redFlags.map(r => <li key={r}>{r}</li>)}</ul>
      </section>
      <p className={styles.footerNote}>This is a coaching plan, not medical advice. <Link href="/pathway" style={{ color: "var(--pw-lime)" }}>Back to today →</Link></p>
    </>
  );
}
