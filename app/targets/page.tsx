"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ClubNavigation from "../components/dashboard/ClubNavigation";
import styles from "./targets.module.css";
import { PROOF_ZONES, TARGET_ZONES_FOR_PS5, type ZoneId, type ZoneState } from "../lib/targets";

const STATUS_LABEL: Record<ZoneState["status"], string> = { done: "Done this week", waiting: "In progress", "not-started": "Not started" };

type Proof = { note: string; confirmed: boolean };
type TargetsData = { zones: Record<string, ZoneState> | null; proofs: Partial<Record<string, Proof>>; ps5Targets: { done: number; need: number } | null };

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
  const router = useRouter();
  const [data, setData] = useState<TargetsData | null>(null);
  const load = () => fetch("/api/targets", { cache: "no-store" }).then(r => r.json()).then(setData).catch(() => setData(null));
  useEffect(() => { load(); }, []);
  const zones = data?.zones ?? null;
  const state = zones?.[active.id];
  const isProofZone = PROOF_ZONES.includes(active.id as ZoneId);
  return <main className={styles.page} aria-label="ANSAR OS Targets"><ClubNavigation activeLabel="Targets" /><section className={styles.content}>
    <header className={styles.hero}><div><p>ANSAR OS · TARGET MAP</p><h1>Build the player.<br />Build the person.</h1><span>Every big goal becomes a next move you can prove.</span></div><aside><b>8</b><span>development zones</span><b>{data?.ps5Targets ? `${data.ps5Targets.done}/${data.ps5Targets.need}` : TARGET_ZONES_FOR_PS5}</b><span>{data?.ps5Targets ? "zones done for Saturday PS5" : "zones needed for PS5 from 12 Oct"}</span></aside></header>
    <div className={styles.map} aria-label="Target zones">{TARGETS.map(target => <button key={target.id} onClick={() => { if (target.id === "football") { router.push("/pathway"); return; } setActive(target); setExpanded(false); }} className={active.id === target.id ? styles.active : ""}><i>{target.icon}</i><span>{target.title}</span><small>{target.horizon}</small>{zones?.[target.id] ? <em className={styles[zones[target.id].status]}>{STATUS_LABEL[zones[target.id].status]}</em> : null}</button>)}</div>
    <section className={styles.route}><div className={styles.routeTop}><span className={styles.bigIcon}>{active.icon}</span><div><p>{active.horizon}</p><h2>{active.title}</h2><strong>{active.destination}</strong></div>{active.id === "football" ? <button onClick={() => router.push("/pathway")}>Open Football Pathway ⚽</button> : <button onClick={() => setExpanded(value => !value)}>{expanded ? "Close route" : "Open route"}</button>}</div>
      <div className={styles.now}><div><span>Current focus</span><b>{active.focus}</b></div><div><span>Next proof</span><b>{active.proof}</b></div>{state ? <div><span>This week on the board</span><b>{state.note}</b></div> : null}</div>
      {isProofZone && zones ? <ProofPanel key={active.id} zone={active.id} proof={data?.proofs[active.id]} onSaved={load} /> : null}
      {expanded ? <div className={styles.steps}>{active.steps.map((step, i) => <article key={step}><em>{i + 1}</em><b>{step}</b><span>{i === 0 ? "This week" : i === 1 ? "Build evidence" : "Look back honestly"}</span></article>)}</div> : null}
    </section>
    <section className={styles.rule}><div><p>THE TARGETS RULE</p><h2>No target earns a green light just because it sounds good.</h2><span>{`A target moves only when there is a real piece of work, practice or evidence behind it. Football, school, Qur'an, Turkish and digital read this week from the board's habit ticks and school blocks. Outdoors, boxing and chess need a proof logged here and confirmed by a parent with the PIN. From 12 October, Saturday PS5 needs ${TARGET_ZONES_FOR_PS5} of the 8 zones done.`}</span></div><div className={styles.actions}><button onClick={() => setActive(TARGETS[1])}>Find learning gaps</button><button onClick={() => setActive(TARGETS[4])}>Build something on Mac</button><button onClick={() => router.push("/pathway")}>Open Football Pathway</button></div></section>
  </section></main>;
}

/** Log this week's proof for an outdoors / boxing / chess zone, then a parent confirms it with the PIN. */
function ProofPanel({ zone, proof, onSaved }: { zone: string; proof?: Proof; onSaved: () => void }) {
  const [note, setNote] = useState(proof?.note ?? "");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async (body: object) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone, ...body }) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { setError(out.message ?? out.error ?? "Could not save"); return; }
      setPin(""); onSaved();
    } catch { setError("Could not reach the board"); } finally { setBusy(false); }
  };
  if (proof?.confirmed) return <div className={styles.proof}><span>This week's proof · confirmed by a parent</span><b>{proof.note}</b></div>;
  return <div className={styles.proof}>
    <label htmlFor={`proof-${zone}`}>{proof ? "This week's proof · waiting for a parent" : "Log this week's proof"}</label>
    <textarea id={`proof-${zone}`} value={note} maxLength={500} rows={3} onChange={e => setNote(e.target.value)} placeholder="What did you do, and what changed?" />
    <div className={styles.proofActions}>
      <button disabled={busy || note.trim().length < 3 || note.trim() === proof?.note} onClick={() => send({ note })}>{proof ? "Update proof" : "Log proof"}</button>
      {proof ? <><label htmlFor={`pin-${zone}`} className={styles.srOnly}>Parent PIN</label><input id={`pin-${zone}`} type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={e => setPin(e.target.value)} placeholder="Parent PIN" /><button disabled={busy || !pin} onClick={() => send({ confirm: true, pin })}>Parent confirm</button></> : null}
    </div>
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
