"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "../../pathway/components/ui";
import type { Benchmark, Hero, LibraryItem, OsLibrary } from "../data/types";
import type { Section } from "./sections";
import { bestOf, tierFor, useZoneStore } from "./useZoneStore";
import styles from "../../pathway/pathway.module.css";
import os from "../os.module.css";

export function ZoneNav({ sections, name }: { sections: Section[]; name: string }) {
  const path = usePathname();
  const home = sections[0].href;
  return (
    <nav className={styles.subnav} aria-label={`${name} sections`}>
      <div className={styles.subnavInner}>
        <Link href="/targets" className={styles.tab}>← Targets</Link>
        {sections.map(s => {
          const active = s.href === home ? path === home : path?.startsWith(s.href);
          return <Link key={s.href} href={s.href} className={`${styles.tab} ${active ? styles.tabActive : ""}`} aria-current={active ? "page" : undefined}><span aria-hidden="true">{s.icon}</span>{s.label}</Link>;
        })}
      </div>
    </nav>
  );
}

export function ZoneHero({ kicker, title, lead, mark, children }: { kicker: string; title: string; lead: string; mark?: string; children?: ReactNode }) {
  return (
    <header className={`${styles.hero} ${os.zoneHero}`}>
      {mark ? <span className={os.mark} aria-hidden="true">{mark}</span> : null}
      <div className={styles.heroInner}>
        <div><p className={styles.kicker}>{kicker}</p><h1 className={styles.title}>{title}</h1><p className={styles.lead}>{lead}</p></div>
        {children}
      </div>
    </header>
  );
}

/* ── Library (the drill library, for any area) ─────────────────────────── */

export function ItemDetail({ item }: { item: LibraryItem }) {
  return (
    <>
      <p className={styles.kicker}>{item.category} · {item.minutes} min</p>
      <h2 style={{ margin: "6px 0 12px", font: "800 30px Georgia, serif" }}>{item.name}</h2>
      <p style={{ fontSize: 16, lineHeight: 1.5 }}>{item.why}</p>
      <p className={styles.small}><b>You need:</b> <span className={styles.muted}>{item.kit}</span></p>
      <div className={styles.grid2}>
        <div><h3>How</h3><ol className={styles.list}>{item.steps.map(s => <li key={s}>{s}</li>)}</ol></div>
        <div><h3>Coach says</h3><ul className={styles.list}>{item.points.map(s => <li key={s}>{s}</li>)}</ul></div>
      </div>
      <h3>Targets</h3>
      <div className={styles.medals}>
        <div className={styles.medal}><b className={styles.tier_bronze}>🥉 Bronze</b>{item.targets.bronze}</div>
        <div className={styles.medal}><b className={styles.tier_silver}>🥈 Silver</b>{item.targets.silver}</div>
        <div className={styles.medal}><b className={styles.tier_gold}>🥇 Gold</b>{item.targets.gold}</div>
      </div>
      <p style={{ marginTop: 16 }}><a className={styles.btn} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.watch)}`} target="_blank" rel="noopener noreferrer">▶ Watch it done for real</a></p>
    </>
  );
}

export function ZoneLibrary({ library }: { library: OsLibrary }) {
  const [cat, setCat] = useState<string>("All");
  const [open, setOpen] = useState<LibraryItem | null>(null);
  useEffect(() => {
    const fromHash = () => { const i = library.items.find(x => x.id === window.location.hash.slice(1)); if (i) setOpen(i); };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [library.items]);
  const close = () => { setOpen(null); if (window.location.hash) history.replaceState(null, "", window.location.pathname); };
  const list = cat === "All" ? library.items : library.items.filter(i => i.category === cat);
  return (
    <>
      <div className={styles.chips} role="group" aria-label={`Filter ${library.label}`}>
        {["All", ...library.categories].map(c => <button key={c} type="button" className={`${styles.chip} ${cat === c ? styles.chipOn : ""}`} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className={styles.drillGrid}>
        {list.map(i => (
          <button key={i.id} id={i.id} type="button" className={styles.drillCard} onClick={() => setOpen(i)} aria-haspopup="dialog">
            <h3>{i.name}</h3>
            <p className={styles.muted} style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.45 }}>{i.why}</p>
            <div className={styles.drillMeta}>
              <span className={`${styles.pill} ${styles.pillLime}`}>{i.category}</span>
              <span className={styles.pill}>⏱ {i.minutes} min</span>
              <span className={`${styles.pill} ${styles.pillGold}`}>🥇 {i.targets.gold}</span>
            </div>
          </button>
        ))}
      </div>
      {open ? <Modal label={open.name} onClose={close}><ItemDetail item={open} /></Modal> : null}
    </>
  );
}

/* ── Test day (personal bests) ─────────────────────────────────────────── */

const TIER_LABEL = { gold: "🥇 Gold", silver: "🥈 Silver", bronze: "🥉 Bronze", starting: "🌱 Building" } as const;

export function ZoneBenchmarks({ zone, benchmarks }: { zone: string; benchmarks: Benchmark[] }) {
  const { state, saveScore } = useZoneStore(zone);
  const [draft, setDraft] = useState<Record<string, string>>({});
  return (
    <div>
      {benchmarks.map(b => {
        const best = bestOf(b, state.scores);
        const tier = tierFor(b, best ? Number(best.value) : undefined);
        return (
          <div key={b.id} className={styles.benchRow}>
            <span className={styles.benchIcon} aria-hidden="true">{b.icon}</span>
            <div>
              <b>{b.test}</b>
              <div className={styles.small}><span className={styles.muted}>{b.how} · 🥉 {b.bronze} · 🥈 {b.silver} · 🥇 {b.gold} {b.unit} ({b.better} is better)</span></div>
              <div className={styles.small} style={{ marginTop: 4 }}>
                {best ? <>Best: <b>{Number(best.value)} {b.unit}</b> <span className={tier ? styles[`tier_${tier}`] : ""}>{tier ? TIER_LABEL[tier] : ""}</span> <span className={styles.muted}>· {best.log_date}</span></> : <span className={styles.muted}>No score yet. Test it this month.</span>}
              </div>
            </div>
            <form className={styles.benchForm} onSubmit={e => { e.preventDefault(); const v = Number(draft[b.id]); if (draft[b.id] && Number.isFinite(v)) { saveScore(b.id, v); setDraft(d => ({ ...d, [b.id]: "" })); } }}>
              <label className="sr-only" htmlFor={`pb-${b.id}`}>New score for {b.test}</label>
              <input id={`pb-${b.id}`} className={styles.benchInput} inputMode="decimal" placeholder={b.unit} value={draft[b.id] ?? ""} onChange={e => setDraft(d => ({ ...d, [b.id]: e.target.value }))} />
              <button type="submit" className={styles.btn} style={{ padding: "8px 12px" }}>Log</button>
            </form>
          </div>
        );
      })}
      <p className={styles.storageNote}>{state.storage === "supabase" ? "Saved to Ansar's record." : state.storage === "local" ? "Saved on this device for now." : "Loading…"}</p>
    </div>
  );
}

/* ── Heroes ────────────────────────────────────────────────────────────── */

function Story({ h }: { h: Hero }) {
  return (
    <>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ fontSize: 56 }}>{h.emoji}</span>
        <div><p className={styles.kicker}>{h.country} · {h.known}</p><h2 style={{ margin: "4px 0", font: "800 32px Georgia, serif" }}>{h.name}</h2><span className={styles.muted}>Born {h.born}</span></div>
      </div>
      <p style={{ fontSize: 18, lineHeight: 1.45, fontFamily: "Georgia, serif", color: "var(--pw-gold)", margin: "16px 0 0" }}>{h.tagline}</p>
      <div className={styles.storyBlock}><h4>🏠 Growing up</h4><p style={{ margin: 0, lineHeight: 1.6 }}>{h.childhood}</p></div>
      <div className={`${styles.storyBlock} ${styles.storyHard}`}><h4>🧱 What was hard</h4><ul className={styles.list}>{h.hardship.map(x => <li key={x}>{x}</li>)}</ul></div>
      <div className={styles.storyBlock}><h4>🚀 What they did about it</h4><ul className={styles.list}>{h.overcame.map(x => <li key={x}>{x}</li>)}</ul></div>
      <div className={`${styles.storyBlock} ${styles.storyLesson}`}><h4>⭐ The lesson for Ansar</h4><p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 16 }}>{h.lesson}</p><span className={`${styles.pill} ${styles.pillLime}`}>This week&apos;s challenge</span><p style={{ margin: "8px 0 0" }}>{h.challenge}</p></div>
    </>
  );
}

export function HeroGrid({ people }: { people: Hero[] }) {
  const [open, setOpen] = useState<Hero | null>(null);
  return (
    <>
      <div className={styles.legendGrid}>
        {people.map(h => (
          <button key={h.id} type="button" className={styles.legendCard} style={{ ["--legend" as string]: h.colour }} onClick={() => setOpen(h)} aria-haspopup="dialog">
            <span className={styles.legendEmoji} aria-hidden="true">{h.emoji}</span><h3>{h.name}</h3><p>{h.tagline}</p><em>Read the story →</em>
          </button>
        ))}
      </div>
      {open ? <Modal label={`${open.name} story`} onClose={() => setOpen(null)}><Story h={open} /></Modal> : null}
    </>
  );
}
