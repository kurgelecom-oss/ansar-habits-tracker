"use client";

import { useState } from "react";
import styles from "./progress.module.css";

type Area = { name: string; logs: number; note: string; state: "clear" | "gap" | "watch" };

// This is an immutable transcription of the supplied Week 8 report. It is not
// inferred from habits, and it intentionally appears only for that reviewed
// week until the Work Log becomes a queryable source.
const WEEK_8: Area[] = [
  { name: "English", logs: 9, note: "ReadTheory, The Giver and Khan Grammar", state: "clear" },
  { name: "Mathematics", logs: 4, note: "Rational numbers unit closed; rates next", state: "clear" },
  { name: "Science", logs: 0, note: "Wednesday Block 4 missed; third week without a Science log", state: "gap" },
  { name: "HASS", logs: 4, note: "History only; geography, civics and economics remain uncovered", state: "watch" },
  { name: "The Arts", logs: 1, note: "Canva aqueduct diagram", state: "clear" },
  { name: "Health & PE", logs: 2, note: "Training logged, but one item reused old evidence", state: "watch" },
  { name: "Technologies", logs: 3, note: "Scratch, typing and EverFi; budgeting was misfiled", state: "watch" },
  { name: "Languages", logs: 3, note: "Turkish practice logged across the week", state: "clear" },
];

export default function EvidenceReviewPanel({ selectedWeek }: { selectedWeek: string }) {
  const [mode, setMode] = useState<"coverage" | "integrity" | "next">("coverage");
  const [gapsOnly, setGapsOnly] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const imported = selectedWeek === "overview" || selectedWeek === "2026-08-31";
  if (!imported) return <section className={styles.evidenceEmpty}><h2>Evidence review</h2><p>No verified evidence review has been imported for this week yet. Habit completion remains visible above; this panel will not guess curriculum coverage.</p></section>;
  const shown = gapsOnly ? WEEK_8.filter(area => area.state !== "clear") : WEEK_8;
  return <section className={styles.evidence} aria-label="Week 8 evidence review">
    <header className={styles.evidenceHeader}><div><p className={styles.kicker}>Imported report · Week 8</p><h2>Green — half-certified</h2><p>3 full days out of 4. Work evidence is strong; the weekly verdict is held back by missing Science proof and a record mismatch.</p></div><div className={styles.evidenceMetrics}><span><b>26</b> work logs</span><span><b>100%</b> evidence rate</span><span><b>4</b> journals</span></div></header>
    <div className={styles.controlRow}><div className={styles.modeTabs}><button className={mode === "coverage" ? styles.selectedTab : ""} onClick={() => setMode("coverage")}>Coverage</button><button className={mode === "integrity" ? styles.selectedTab : ""} onClick={() => setMode("integrity")}>Evidence integrity</button><button className={mode === "next" ? styles.selectedTab : ""} onClick={() => setMode("next")}>Next week&apos;s proof</button></div>{mode === "coverage" ? <button className={gapsOnly ? styles.selectedTab : ""} onClick={() => setGapsOnly(value => !value)}>Only gaps</button> : null}</div>
    {mode === "coverage" ? <><div className={styles.areaGrid}>{shown.map(area => <button key={area.name} className={`${styles.area} ${styles[area.state]}`} onClick={() => setSelectedArea(area)} aria-label={area.name}><b>{area.logs}</b><span>{area.name}</span><small>{area.state === "gap" ? "needs proof" : area.state === "watch" ? "watch" : "covered"}</small></button>)}</div>{selectedArea ? <aside className={styles.detail}><b>{selectedArea.name}</b><p>{selectedArea.note}</p><button onClick={() => setSelectedArea(null)}>Close detail</button></aside> : null}</> : null}
    {mode === "integrity" ? <div className={styles.findings}><article><b>2 duplicate / stale files</b><p>One screenshot was credited to two dates; one training photo had already been used the prior week.</p></article><article><b>1 subject misfiled</b><p>EverFi budgeting is Mathematics or Economics, not Technologies.</p></article><article><b>1 scoreboard conflict</b><p>Wednesday was marked complete although no Science entry exists in the work log.</p></article></div> : null}
    {mode === "next" ? <ol className={styles.proofList}><li><b>Science before anything else on Wednesday.</b><span>One logged Science item with a same-day photo.</span></li><li><b>One screenshot, one day.</b><span>Evidence filename and date must match the work date.</span></li><li><b>Close Ottoman with geography and economics.</b><span>One map and one economics output, not more history.</span></li></ol> : null}
  </section>;
}
