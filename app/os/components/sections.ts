import type { ZoneOS } from "../data/types";

export type Section = { href: string; icon: string; label: string; blurb: string };

/** Every zone OS has the Football Pathway's sections, named for its own area. */
export function sectionsFor(os: ZoneOS): Section[] {
  const base = `/os/${os.id}`;
  return [
    { href: base, icon: os.icon, label: "Today", blurb: "Your plan, your ticks, Mum's focus" },
    { href: `${base}/library`, icon: os.library.icon, label: os.library.label, blurb: `${os.library.items.length} skills with Bronze, Silver and Gold targets` },
    ...os.programmes.map(p => ({ href: `${base}/p/${p.id}`, icon: p.icon, label: p.label, blurb: p.kicker })),
    { href: `${base}/tests`, icon: "🔭", label: "Test day", blurb: "What experts look for + your scores" },
    { href: `${base}/season`, icon: "📅", label: "Season", blurb: "Day, week, month, year" },
    { href: `${base}/heroes`, icon: "🌍", label: "Heroes", blurb: os.heroes.title },
    { href: `${base}/watch`, icon: "📺", label: "Watch", blurb: "What's worth your screen time" },
  ];
}

export const formatTime = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`; };
