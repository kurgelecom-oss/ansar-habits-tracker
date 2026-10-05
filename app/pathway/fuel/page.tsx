import { PageHero } from "../components/ui";
import { MATCH_DAY_FUEL, NEVER_FOODS, PLATES, TRAINING_DAY_FUEL, TREAT_NO, TREAT_PRINCIPLES, TREAT_YES } from "../data/lifestyle";
import styles from "../pathway.module.css";

export const revalidate = 300;

const NIHAL_OS = "https://nihal-os-control-room.netlify.app";

type Kitchen = { dinner: { title: string; detail: string }; weekday: string; note?: string };

/** Tonight's family dinner, straight from Nihal OS. Null when it can't be reached — shown honestly. */
async function getKitchen(): Promise<Kitchen | null> {
  try {
    const r = await fetch(`${NIHAL_OS}/api/kitchen`, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.dinner?.title ? data as Kitchen : null;
  } catch { return null; }
}

export default async function FuelPage() {
  const kitchen = await getKitchen();
  return (
    <>
      <PageHero kicker="🥗 Fuel" title="Eat like the player you want to be" lead="Food is fuel for training and for growing. No diets, no supplements, no banned foods — just the right food at the right time, and treats in their windows. Mum runs the kitchen." />
      <section className={styles.card} style={{ borderColor: "rgba(167,139,250,.5)" }}>
        <p className={styles.kicker}>🍽️ Live from Mum&apos;s kitchen · Nihal OS</p>
        {kitchen ? <><h2>Tonight: {kitchen.dinner.title}</h2><p className={styles.muted} style={{ margin: 0 }}>{kitchen.dinner.detail}{kitchen.note ? ` · ${kitchen.note}` : ""}</p></> : <><h2>Tonight&apos;s dinner</h2><p className={styles.muted} style={{ margin: 0 }}>Nihal OS isn&apos;t reachable right now — ask Mum what&apos;s on tonight.</p></>}
        <p style={{ marginBottom: 0 }}><a className={`${styles.btn} ${styles.btnGhost}`} href={NIHAL_OS} target="_blank" rel="noopener noreferrer">Open Mum&apos;s control room ↗</a></p>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>Build the plate</h2></div>
        <div className={styles.grid2}>
          {PLATES.map(p => (
            <div key={p.name} className={styles.card}>
              <h3>{p.name}</h3><span className={`${styles.pill} ${styles.pillLime}`}>{p.when}</span>
              <div style={{ display: "flex", height: 26, borderRadius: 999, overflow: "hidden", margin: "14px 0 8px" }}>
                {p.split.map(([label, pct], i) => <div key={label} title={label} style={{ width: `${pct}%`, background: ["#e7c55b", "#ff8a6b", "#8fe35a"][i] }} />)}
              </div>
              {p.split.map(([label, pct], i) => <div key={label} className={styles.small}><span style={{ color: ["#e7c55b", "#ff8a6b", "#8fe35a"][i] }}>●</span> {pct}% {label}</div>)}
              <p className={`${styles.small} ${styles.muted}`}>e.g. {p.examples}</p>
            </div>
          ))}
        </div>
      </section>
      <div className={`${styles.grid2} ${styles.section}`}>
        <section className={styles.card}><h2>⚽ Training day</h2>{TRAINING_DAY_FUEL.map(f => <div key={f.time} style={{ marginBottom: 10 }}><b>{f.icon} {f.time}</b><div className={styles.muted}>{f.what}</div></div>)}</section>
        <section className={styles.card}><h2>🏟️ Match day</h2>{MATCH_DAY_FUEL.map(f => <div key={f.time} style={{ marginBottom: 10 }}><b>{f.icon} {f.time}</b><div className={styles.muted}>{f.what}</div></div>)}<h3 style={{ marginTop: 18 }}>💧 Water check</h3><p className={styles.muted} style={{ margin: 0 }}>Two full bottles on a school day, three on a training day. Pale-yellow pee = you&apos;re good.</p></section>
      </div>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>🍕 Treat windows</h2><span className={styles.muted}>Mum can open or close any window</span></div>
        <div className={styles.grid2}>
          <div className={styles.card}><h3>✅ Yes, enjoy it</h3>{TREAT_YES.map(t => <div key={t.when} style={{ marginBottom: 10 }}><b>{t.icon} {t.when}</b><div className={styles.muted}>{t.rule}</div></div>)}</div>
          <div className={`${styles.card} ${styles.redFlag}`}><h3>⛔ Not now</h3>{TREAT_NO.map(t => <div key={t.when} style={{ marginBottom: 10 }}><b>{t.icon} {t.when}</b><div className={styles.muted}>{t.rule}</div></div>)}</div>
        </div>
        <div className={`${styles.card} ${styles.section}`}><ul className={styles.list}>{TREAT_PRINCIPLES.map(t => <li key={t}>{t}</li>)}</ul></div>
      </section>
      <section className={`${styles.card} ${styles.section} ${styles.redFlag}`}><h2>🚫 Never</h2><ul className={styles.list}>{NEVER_FOODS.map(t => <li key={t}>{t}</li>)}</ul></section>
      <p className={styles.footerNote}>A family planning guide, not medical or dietetic advice. Allergies and medical needs come first.</p>
    </>
  );
}
