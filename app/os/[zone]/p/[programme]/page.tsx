import Link from "next/link";
import { notFound } from "next/navigation";
import { ZONE_OS, getZone } from "../../../data";
import { ZoneHero } from "../../../components/ui";
import styles from "../../../../pathway/pathway.module.css";

export function generateStaticParams() {
  return Object.values(ZONE_OS).flatMap(os => os.programmes.map(p => ({ zone: os.id, programme: p.id })));
}

/** One layout for every training programme, like the Pathway's Fitness / Conditioning / Strength. */
export default async function ProgrammePage({ params }: { params: Promise<{ zone: string; programme: string }> }) {
  const { zone, programme } = await params;
  const os = getZone(zone);
  const p = os?.programmes.find(x => x.id === programme);
  if (!os || !p) notFound();
  return (
    <>
      <ZoneHero mark={os.icon} kicker={`${p.icon} ${p.kicker}`} title={p.title} lead={p.intro} />
      <section className={styles.card}><h2>The rules</h2><ul className={styles.list}>{p.rules.map(r => <li key={r}>{r}</li>)}</ul></section>
      {p.blocks.map(block => (
        <section key={block.name} className={`${styles.card} ${styles.section}`}>
          <p className={styles.kicker}>{block.when}</p>
          <h2>{block.name}</h2>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.exTable}>
              <thead><tr><th>What</th><th>Dose</th><th>Coach says</th></tr></thead>
              <tbody>{block.items.map(ex => <tr key={ex.name}><td>{ex.name}</td><td>{ex.dose}</td><td className={styles.muted}>{ex.cue}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ))}
      <section className={`${styles.card} ${styles.section} ${styles.redFlag}`}><h2>🚩 Stop and tell Mum if…</h2><ul className={styles.list}>{p.redFlags.map(r => <li key={r}>{r}</li>)}</ul></section>
      <p className={styles.footerNote}><Link href={`/os/${os.id}`} style={{ color: "var(--pw-accent)" }}>Back to today →</Link></p>
    </>
  );
}
