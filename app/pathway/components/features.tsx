"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, DRILLS, type Drill, type DrillCategory } from "../data/drills";
import { LEGENDS, type Legend } from "../data/legends";
import { BENCHMARKS, tierFor } from "../data/scouts";
import { Modal, PitchDiagram } from "./ui";
import { usePathwayStore } from "./usePathwayStore";
import styles from "../pathway.module.css";

/* ── Drill library ───────────────────────────────────────────────────── */

export function DrillDetail({ drill }: { drill: Drill }) {
  return (
    <>
      <p className={styles.kicker}>{drill.category} · {drill.minutes} min</p>
      <h2 style={{ margin: "6px 0 12px", font: "800 30px Georgia, serif" }}>{drill.name}</h2>
      <PitchDiagram d={drill.diagram} title={drill.name} />
      <p style={{ fontSize: 16, lineHeight: 1.5 }}>{drill.why}</p>
      <p className={styles.small}><b>Kit:</b> <span className={styles.muted}>{drill.kit}</span></p>
      <div className={styles.grid2}>
        <div><h3>How</h3><ol className={styles.list}>{drill.steps.map(s => <li key={s}>{s}</li>)}</ol></div>
        <div><h3>Coach says</h3><ul className={styles.list}>{drill.points.map(s => <li key={s}>{s}</li>)}</ul></div>
      </div>
      <h3>Targets for 12-year-olds</h3>
      <div className={styles.medals}>
        <div className={styles.medal}><b className={styles.tier_bronze}>🥉 Bronze</b>{drill.targets.bronze}</div>
        <div className={styles.medal}><b className={styles.tier_silver}>🥈 Silver</b>{drill.targets.silver}</div>
        <div className={styles.medal}><b className={styles.tier_gold}>🥇 Gold</b>{drill.targets.gold}</div>
      </div>
      <p style={{ marginTop: 16 }}>
        <a className={styles.btn} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(drill.watch)}`} target="_blank" rel="noopener noreferrer">▶ Watch it done for real</a>
      </p>
    </>
  );
}

export function DrillLibrary() {
  const [cat, setCat] = useState<DrillCategory | "All">("All");
  const [open, setOpen] = useState<Drill | null>(null);
  useEffect(() => {
    const fromHash = () => { const id = window.location.hash.slice(1); const d = DRILLS.find(x => x.id === id); if (d) setOpen(d); };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  const close = () => { setOpen(null); if (window.location.hash) history.replaceState(null, "", window.location.pathname); };
  const list = cat === "All" ? DRILLS : DRILLS.filter(d => d.category === cat);
  return (
    <>
      <div className={styles.chips} role="group" aria-label="Filter drills">
        {(["All", ...CATEGORIES] as const).map(c => (
          <button key={c} type="button" className={`${styles.chip} ${cat === c ? styles.chipOn : ""}`} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className={styles.drillGrid}>
        {list.map(d => (
          <button key={d.id} id={d.id} type="button" className={styles.drillCard} onClick={() => setOpen(d)} aria-haspopup="dialog">
            <PitchDiagram d={d.diagram} title={d.name} />
            <h3>{d.name}</h3>
            <div className={styles.drillMeta}>
              <span className={`${styles.pill} ${styles.pillLime}`}>{d.category}</span>
              <span className={styles.pill}>⏱ {d.minutes} min</span>
              <span className={`${styles.pill} ${styles.pillGold}`}>🥇 {d.targets.gold}</span>
            </div>
          </button>
        ))}
      </div>
      {open ? <Modal label={open.name} onClose={close}><DrillDetail drill={open} /></Modal> : null}
    </>
  );
}

/* ── Legends ─────────────────────────────────────────────────────────── */

function Story({ l }: { l: Legend }) {
  return (
    <>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ fontSize: 56 }}>{l.emoji}</span>
        <div>
          <p className={styles.kicker}>{l.country} · {l.known}</p>
          <h2 style={{ margin: "4px 0", font: "800 32px Georgia, serif" }}>{l.name}</h2>
          <span className={styles.muted}>Born {l.born}</span>
        </div>
      </div>
      <p style={{ fontSize: 18, lineHeight: 1.45, fontFamily: "Georgia, serif", color: "#e7c55b", margin: "16px 0 0" }}>{l.tagline}</p>
      <div className={styles.storyBlock}><h4>🏠 Growing up</h4><p style={{ margin: 0, lineHeight: 1.6 }}>{l.childhood}</p></div>
      <div className={`${styles.storyBlock} ${styles.storyHard}`}><h4>🧱 What was hard</h4><ul className={styles.list}>{l.hardship.map(h => <li key={h}>{h}</li>)}</ul></div>
      <div className={styles.storyBlock}><h4>🚀 What he did about it</h4><ul className={styles.list}>{l.overcame.map(h => <li key={h}>{h}</li>)}</ul></div>
      <div className={`${styles.storyBlock} ${styles.storyLesson}`}><h4>⭐ The lesson for Ansar</h4><p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 16 }}>{l.lesson}</p><span className={`${styles.pill} ${styles.pillLime}`}>This week's challenge</span><p style={{ margin: "8px 0 0" }}>{l.challenge}</p></div>
    </>
  );
}

export function LegendGrid() {
  const [open, setOpen] = useState<Legend | null>(null);
  return (
    <>
      <div className={styles.legendGrid}>
        {LEGENDS.map(l => (
          <button key={l.id} type="button" className={styles.legendCard} style={{ ["--legend" as string]: l.colour }} onClick={() => setOpen(l)} aria-haspopup="dialog">
            <span className={styles.legendEmoji} aria-hidden="true">{l.emoji}</span>
            <h3>{l.name}</h3>
            <p>{l.tagline}</p>
            <em>Read his story →</em>
          </button>
        ))}
      </div>
      {open ? <Modal label={`${open.name} story`} onClose={() => setOpen(null)}><Story l={open} /></Modal> : null}
    </>
  );
}

/* ── Benchmarks (personal bests) ─────────────────────────────────────── */

const TIER_LABEL = { gold: "🥇 Gold", silver: "🥈 Silver", bronze: "🥉 Bronze", starting: "⚽ Building" } as const;

export function Benchmarks() {
  const { state, savePb } = usePathwayStore();
  const [draft, setDraft] = useState<Record<string, string>>({});
  return (
    <div>
      {BENCHMARKS.map(b => {
        const best = state.pbs[b.id];
        const tier = tierFor(b, best?.value);
        return (
          <div key={b.id} className={styles.benchRow}>
            <span className={styles.benchIcon} aria-hidden="true">{b.icon}</span>
            <div>
              <b>{b.test}</b>
              <div className={styles.small}>
                <span className={styles.muted}>{b.how} · 🥉 {b.bronze} · 🥈 {b.silver} · 🥇 {b.gold} {b.unit} ({b.better === "higher" ? "higher" : "lower"} is better)</span>
              </div>
              <div className={styles.small} style={{ marginTop: 4 }}>
                {best ? <>Best: <b>{best.value} {b.unit}</b> <span className={tier ? styles[`tier_${tier}`] : ""}>{tier ? TIER_LABEL[tier] : ""}</span> <span className={styles.muted}>· {best.date}</span></> : <span className={styles.muted}>No score yet — test it this month.</span>}
              </div>
            </div>
            <form className={styles.benchForm} onSubmit={e => { e.preventDefault(); const v = Number(draft[b.id]); if (Number.isFinite(v) && draft[b.id] !== "") { savePb(b.id, v); setDraft(d => ({ ...d, [b.id]: "" })); } }}>
              <label className="sr-only" htmlFor={`pb-${b.id}`}>New score for {b.test}</label>
              <input id={`pb-${b.id}`} className={styles.benchInput} inputMode="decimal" placeholder={b.unit} value={draft[b.id] ?? ""} onChange={e => setDraft(d => ({ ...d, [b.id]: e.target.value }))} />
              <button type="submit" className={styles.btn} style={{ padding: "8px 12px" }}>Log</button>
            </form>
          </div>
        );
      })}
      <p className={styles.storageNote}>{state.storage === "local" ? "Saved on this device only until the Pathway database is switched on." : state.storage === "supabase" ? "Saved to Ansar's record — Mum sees it too." : "Loading…"}</p>
    </div>
  );
}
