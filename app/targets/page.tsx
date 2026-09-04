"use client";

import { useState } from "react";
import ClubNavigation from "../components/dashboard/ClubNavigation";
import styles from "./targets.module.css";

type Target = { id: string; icon: string; title: string; horizon: string; destination: string; focus: string; proof: string; steps: string[] };
const TARGETS: Target[] = [
  { id:"football", icon:"⚽", title:"Football pathway", horizon:"Long game", destination:"Become the player coaches trust when it matters.", focus:"First touch, scanning, stamina and match discipline.", proof:"Film one skill session and write one learning note each week.", steps:["Train with intent","Build game IQ","Review the week"] },
  { id:"scholar", icon:"📚", title:"Strong across learning", horizon:"Term target", destination:"Build real capability across every learning area.", focus:"Close Science, Geography and Economics gaps with evidence.", proof:"One verified output in every scheduled area each week.", steps:["Plan the blocks","Make the work","Log proof"] },
  { id:"languages", icon:"🗣️", title:"Turkish & Quranic Arabic", horizon:"Daily craft", destination:"Understand, speak and recognise more each month.", focus:"Small daily repetitions beat occasional big sessions.", proof:"Five language touches plus one recitation reflection weekly.", steps:["Listen & repeat","Read with meaning","Use it aloud"] },
  { id:"quran", icon:"☪️", title:"Qur'an & Surat Al-Kahf", horizon:"Steady study", destination:"A calm, lasting relationship with Qur'an.", focus:"Recitation, meaning and the lessons of Al-Kahf.", proof:"Record the ayah/section studied and one takeaway.", steps:["Recite","Understand","Live one lesson"] },
  { id:"digital", icon:"⌘", title:"Digital builder", horizon:"Practical skill", destination:"Use a Mac and technology to make useful things.", focus:"Ecom, digital marketing, design, files and safe tools.", proof:"Ship one small project or documented skill each week.", steps:["Learn the tool","Make something","Show the result"] },
  { id:"outdoors", icon:"⛺", title:"Outdoor survival", horizon:"Field-ready", destination:"Be capable, calm and useful outdoors.", focus:"Navigation, shelter, water, knots and first aid.", proof:"Complete one practical drill and capture what changed.", steps:["Learn safety","Practise outdoors","Teach it back"] },
  { id:"combat", icon:"🥊", title:"Boxing & MMA", horizon:"Athlete craft", destination:"Train with control, courage and respect.", focus:"Footwork, defence, conditioning and composure.", proof:"Log sessions, technique focus and recovery.", steps:["Move well","Defend first","Recover properly"] },
  { id:"chess", icon:"♞", title:"Chess thinking", horizon:"Mind game", destination:"See patterns before they arrive.", focus:"Tactics, opening principles and reviewing mistakes.", proof:"Solve three puzzles and review one game weekly.", steps:["Spot tactics","Play slowly","Review choices"] },
];

export default function TargetsPage() {
  const [active, setActive] = useState(TARGETS[0]);
  const [expanded, setExpanded] = useState(false);
  return <main className={styles.page} aria-label="ANSAR OS Targets"><ClubNavigation activeLabel="Targets" /><section className={styles.content}>
    <header className={styles.hero}><div><p>ANSAR OS · TARGET MAP</p><h1>Build the player.<br />Build the person.</h1><span>Every big goal becomes a next move you can prove.</span></div><aside><b>8</b><span>development zones</span><b>1</b><span>next move at a time</span></aside></header>
    <div className={styles.map} aria-label="Target zones">{TARGETS.map(target => <button key={target.id} onClick={() => { setActive(target); setExpanded(false); }} className={active.id === target.id ? styles.active : ""}><i>{target.icon}</i><span>{target.title}</span><small>{target.horizon}</small></button>)}</div>
    <section className={styles.route}><div className={styles.routeTop}><span className={styles.bigIcon}>{active.icon}</span><div><p>{active.horizon}</p><h2>{active.title}</h2><strong>{active.destination}</strong></div><button onClick={() => setExpanded(value => !value)}>{expanded ? "Close route" : "Open route"}</button></div>
      <div className={styles.now}><div><span>Current focus</span><b>{active.focus}</b></div><div><span>Next proof</span><b>{active.proof}</b></div></div>
      {expanded ? <div className={styles.steps}>{active.steps.map((step, i) => <article key={step}><em>{i + 1}</em><b>{step}</b><span>{i === 0 ? "This week" : i === 1 ? "Build evidence" : "Look back honestly"}</span></article>)}</div> : null}
    </section>
    <section className={styles.rule}><div><p>THE TARGETS RULE</p><h2>No target earns a green light just because it sounds good.</h2><span>A target moves only when there is a real piece of work, practice or evidence behind it. Progress will eventually score these proofs; today this map makes the work visible.</span></div><div className={styles.actions}><button onClick={() => setActive(TARGETS[1])}>Find learning gaps</button><button onClick={() => setActive(TARGETS[4])}>Build something on Mac</button><button onClick={() => setActive(TARGETS[0])}>Plan football proof</button></div></section>
  </section></main>;
}
