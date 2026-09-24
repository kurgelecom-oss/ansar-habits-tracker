"use client";

import { useEffect, useState } from "react";
import { PER_WEEK, PLAYERS_FILE, POSITION, playersForWeek, weekIndex, type PlayerStory } from "../data/players";
import { Modal } from "./ui";
import styles from "../pathway.module.css";

const WEEK_FMT = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" });

function Story({ p }: { p: PlayerStory }) {
  const pos = POSITION[p.pos];
  const steal = pos ? (p.she ? pos.steal.replace(/\bhis\b/g, "her").replace(/\bhe\b/g, "she").replace(/\bHe\b/g, "She").replace(/\bhim\b/g, "her") : pos.steal) : "";
  return (
    <>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        {p.image ? <img src={p.image} alt={p.name} width={110} height={110} style={{ width: 110, height: 110, objectFit: "cover", objectPosition: "top", borderRadius: 14, border: "2px solid var(--pw-lime)" }} /> : <span style={{ fontSize: 60 }}>{p.flag}</span>}
        <div>
          <p className={styles.kicker}>{p.flag} {pos?.label ?? p.pos}</p>
          <h2 style={{ margin: "4px 0", font: "800 30px Georgia, serif" }}>{p.name}</h2>
        </div>
      </div>
      {p.lead.length ? <div className={styles.storyBlock}><h4>⚽ The player</h4>{p.lead.map((t, i) => <p key={i} style={{ margin: i ? "10px 0 0" : 0, lineHeight: 1.6 }}>{t}</p>)}</div> : null}
      {p.early.length ? <div className={styles.storyBlock}><h4>🏠 {p.earlyHeading && /career/i.test(p.earlyHeading) ? "How it started" : "Growing up"}</h4>{p.early.map((t, i) => <p key={i} style={{ margin: i ? "10px 0 0" : 0, lineHeight: 1.6 }}>{t}</p>)}</div> : null}
      {pos ? <div className={`${styles.storyBlock} ${styles.storyLesson}`}><h4>🎯 Steal one thing this week</h4><p style={{ margin: 0, fontWeight: 700 }}>{steal}</p></div> : null}
      <p style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a className={styles.btn} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${p.name} every touch analysis`)}`} target="_blank" rel="noopener noreferrer">▶ Watch {p.she ? "her" : "him"} play</a>
        <a className={`${styles.btn} ${styles.btnGhost}`} href={p.source} target="_blank" rel="noopener noreferrer">Read more ↗</a>
      </p>
      <p className={styles.small} style={{ color: "var(--pw-sub)", marginBottom: 0 }}>Text and photo from Wikipedia (CC BY-SA), refreshed {p.fetchedAt}.</p>
    </>
  );
}

export default function PlayersOfWeek() {
  const [week, setWeek] = useState<number | null>(null);
  const [open, setOpen] = useState<PlayerStory | null>(null);
  useEffect(() => setWeek(weekIndex()), []);
  if (week === null) return <p className={styles.muted}>Picking this week&apos;s players…</p>;
  const pool = PLAYERS_FILE.players;
  const picks = playersForWeek(pool, week);
  const monday = new Date(Date.UTC(2024, 0, 1) + week * 7 * 86_400_000);
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);
  if (!picks.length) return <p className={styles.muted}>Player stories are loading tonight — check back tomorrow.</p>;
  return (
    <>
      <div className={styles.sectionHead}><h2>This week · {WEEK_FMT.format(monday)} – {WEEK_FMT.format(sunday)}</h2><span className={styles.muted}>{PER_WEEK} new players every Monday · {pool.length} in the pool</span></div>
      <div className={styles.legendGrid}>
        {picks.map(p => (
          <button key={p.id} type="button" className={styles.legendCard} onClick={() => setOpen(p)} aria-haspopup="dialog" style={{ ["--legend" as string]: "var(--pw-lime)" }}>
            {p.image ? <img src={p.image} alt="" loading="lazy" style={{ width: "100%", height: 170, objectFit: "cover", objectPosition: "top", borderRadius: 10 }} /> : <span className={styles.legendEmoji}>{p.flag}</span>}
            <h3>{p.flag} {p.name}</h3>
            <p>{POSITION[p.pos]?.label ?? p.pos}</p>
            <em>Read the story →</em>
          </button>
        ))}
      </div>
      {open ? <Modal label={`${open.name} story`} onClose={() => setOpen(null)}><Story p={open} /></Modal> : null}
    </>
  );
}
