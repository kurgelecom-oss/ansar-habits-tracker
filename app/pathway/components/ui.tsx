"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Diagram } from "../data/drills";
import styles from "../pathway.module.css";

export const SECTIONS = [
  { href: "/pathway", icon: "⚽", label: "Today", blurb: "Your plan, your ticks, Mum's focus" },
  { href: "/pathway/matches", icon: "🏟️", label: "Matches", blurb: "Fixtures, results and his own match stats" },
  { href: "/pathway/drills", icon: "🎯", label: "Drills", blurb: "16 drills with moving pitch diagrams" },
  { href: "/pathway/fitness", icon: "⚡", label: "Fitness", blurb: "Speed, agility, movement" },
  { href: "/pathway/conditioning", icon: "🫀", label: "Conditioning", blurb: "The engine for the last 10 minutes" },
  { href: "/pathway/strength", icon: "💪", label: "Strength", blurb: "Bodyweight first, earn the weights" },
  { href: "/pathway/fuel", icon: "🥗", label: "Fuel", blurb: "Food, water, treat windows — from Mum's kitchen" },
  { href: "/pathway/screens", icon: "📺", label: "Screens", blurb: "What's worth watching, what's not" },
  { href: "/pathway/scouts", icon: "🔭", label: "Scout's Eye", blurb: "What coaches look for + your tests" },
  { href: "/pathway/season", icon: "📅", label: "Season", blurb: "Day, week, month, year" },
  { href: "/pathway/players", icon: "🌍", label: "Players", blurb: "Six top players, new every Monday" },
];

export function PathwayNav() {
  const path = usePathname();
  return (
    <nav className={styles.subnav} aria-label="Football Pathway sections">
      <div className={styles.subnavInner}>
        <Link href="/targets" className={styles.tab}>← Targets</Link>
        {SECTIONS.map(s => {
          const active = s.href === "/pathway" ? path === "/pathway" : path?.startsWith(s.href);
          return (
            <Link key={s.href} href={s.href} className={`${styles.tab} ${active ? styles.tabActive : ""}`} aria-current={active ? "page" : undefined}>
              <span aria-hidden="true">{s.icon}</span>{s.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** A football with lime-green panels — the pathway's mark. */
export function GreenBall({ size = 28, spin = false }: { size?: number; spin?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ flex: "none" }}>
      <g>
        {spin ? <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="6s" repeatCount="indefinite" /> : null}
        <circle cx="20" cy="20" r="18" fill="#f3f7ef" stroke="#0a2a14" strokeWidth="1.5" />
        <polygon points="20,12 27,17 24.5,25 15.5,25 13,17" fill="#8fe35a" stroke="#0a2a14" strokeWidth="1" />
        <path d="M20 12 L20 3 M27 17 L35 13 M24.5 25 L30 33 M15.5 25 L10 33 M13 17 L5 13" stroke="#0a2a14" strokeWidth="1" />
        <path d="M17 3.5 L23 3.5 L20 7 Z M35.5 16 L36 22 L32 19 Z M31 34 L26 36.5 L27 32 Z M9 34 L14 36.5 L13 32 Z M4.5 16 L4 22 L8 19 Z" fill="#8fe35a" />
      </g>
    </svg>
  );
}

export function PageHero({ kicker, title, lead, children }: { kicker: string; title: string; lead: string; children?: ReactNode }) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <div>
          <p className={styles.kicker}><span style={{ display: "inline-flex", verticalAlign: "middle", marginRight: 8 }}><GreenBall size={18} /></span>{kicker}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lead}>{lead}</p>
        </div>
        {children}
      </div>
    </header>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

function startOf(path: string): [number, number] {
  const m = path.match(/M\s*([\d.]+)[ ,]+([\d.]+)/);
  return m ? [Number(m[1]), Number(m[2])] : [50, 32];
}

/** The looping "GIF": a chalked half-pitch with cones, a wall or goal, and
    Ansar (gold) moving the ball (white) along the drill's path. */
export function PitchDiagram({ d, title }: { d: Diagram; title: string }) {
  const reduced = useReducedMotion();
  const [px, py] = startOf(d.player);
  const [bx, by] = startOf(d.ball);
  const dur = `${d.dur}s`;
  const move = (path: string) => (reduced ? null : <animateMotion dur={dur} repeatCount="indefinite" path={path} rotate="0" />);
  return (
    <figure style={{ margin: 0 }}>
      <svg className={styles.pitch} viewBox="0 0 100 64" role="img" aria-label={`Diagram: ${title}. ${d.label ?? ""}`}>
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x={i * 10} y="0" width="10" height="64" fill={i % 2 ? "#12693a" : "#0f5a2e"} />)}
        <rect x="2" y="2" width="96" height="60" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".5" />
        <line x1="50" y1="2" x2="50" y2="62" stroke="rgba(255,255,255,.35)" strokeWidth=".4" />
        <circle cx="50" cy="32" r="8" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".4" />
        {d.wall ? <><rect x="94" y="6" width="4" height="52" fill="#8a949c" /><text x="96" y="4.5" fontSize="3" fill="#fff" textAnchor="middle">WALL</text></> : null}
        {d.goal ? <><rect x="97" y="22" width="2.5" height="20" fill="none" stroke="#fff" strokeWidth=".8" /><rect x="84" y="16" width="14" height="32" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth=".4" /></> : null}
        <path d={d.ball} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".5" strokeDasharray="1.5 1.5" />
        {d.cones?.map(([x, y], i) => <polygon key={i} points={`${x},${y - 2.2} ${x - 1.8},${y + 1.4} ${x + 1.8},${y + 1.4}`} fill="#ff8a1f" stroke="#7a3b00" strokeWidth=".3" />)}
        {d.partner ? <g><circle cx={d.partner[0]} cy={d.partner[1]} r="2.6" fill="#3aa0ff" stroke="#fff" strokeWidth=".4" /><text x={d.partner[0]} y={d.partner[1] + 1} fontSize="2.6" fill="#fff" textAnchor="middle" fontWeight="700">P</text></g> : null}
        {d.defender ? <g transform={reduced ? `translate(${startOf(d.defender)[0]} ${startOf(d.defender)[1]})` : undefined}><circle r="2.6" fill="#ff5a5a" stroke="#fff" strokeWidth=".4" />{move(d.defender)}</g> : null}
        <g transform={reduced ? `translate(${px} ${py})` : undefined}>
          <circle r="3" fill="#e7c55b" stroke="#fff" strokeWidth=".5" />
          <text y="1.1" fontSize="3" fill="#062010" textAnchor="middle" fontWeight="900">A</text>
          {move(d.player)}
        </g>
        <g transform={reduced ? `translate(${bx} ${by})` : undefined}>
          <circle r="1.5" fill="#fff" stroke="#111" strokeWidth=".3" />
          <circle r=".55" fill="#8fe35a" />
          {move(d.ball)}
        </g>
      </svg>
      {d.label ? <figcaption className={styles.pitchCaption}>{d.label} · <span style={{ color: "#e7c55b" }}>A</span> = you{d.partner ? " · P = partner" : ""}{d.defender ? " · red = defender" : ""}</figcaption> : null}
    </figure>
  );
}

/** Accessible pop-out: Esc closes, backdrop click closes, focus lands on Close, page scroll locks. */
export function Modal({ onClose, label, children }: { onClose: () => void; label: string; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [onClose]);
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()}>
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}
