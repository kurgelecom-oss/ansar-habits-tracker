/* Players of the Week — a deterministic weekly rotation through the pool in
   players.json (refreshed from Wikipedia by scripts/players-sync.mjs).
   Every Monday (Melbourne) a new six. The pool is shuffled once per "lap" so
   nobody repeats until everyone has had a turn, and the order changes each lap. */

import raw from "./players.json";

export interface PlayerStory {
  id: string; name: string; flag: string; pos: string; she?: boolean;
  lead: string[]; early: string[]; earlyHeading: string | null;
  image: string | null; source: string; fetchedAt: string;
}
export const PLAYERS_FILE = raw as unknown as { updated: string; source: string; players: PlayerStory[] };
export const PER_WEEK = 6;

export const POSITION: Record<string, { label: string; steal: string }> = {
  GK: { label: "Goalkeeper", steal: "Watch his feet before the shot: set, balanced, on his toes. Copy his starting position, not the dive." },
  CB: { label: "Centre-back", steal: "Watch how often he scans before the ball comes to him, and how he passes forward through the lines." },
  FB: { label: "Full-back", steal: "Watch when he chooses to overlap and how fast he gets back. Count his recovery sprints." },
  DM: { label: "Defensive midfielder", steal: "Watch his body shape when receiving — always half-turned. Count how many times he checks his shoulder in one minute." },
  CM: { label: "Midfielder", steal: "Watch where he stands when his team has the ball. He's always making a triangle — copy the angle." },
  AM: { label: "Attacking midfielder", steal: "Watch his first touch in tight spaces. Where does it go? Almost always away from pressure." },
  W: { label: "Winger", steal: "Watch his 1v1s: slow in, fast out. Copy one move and try it at Dawn Touches tomorrow." },
  ST: { label: "Striker", steal: "Watch his movement BEFORE the cross or pass — the run that loses the defender. Finishing starts there." },
};

/** Monday-based week number since a fixed Monday, in Melbourne. */
export function weekIndex(now: Date = new Date()): number {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [y, m, d] = day.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const epochMonday = Date.UTC(2024, 0, 1); // a Monday
  return Math.floor((t - epochMonday) / (7 * 86_400_000));
}

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

export function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  const rnd = seeded(seed * 2654435761);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

export function playersForWeek(pool: PlayerStory[], week: number, perWeek = PER_WEEK): PlayerStory[] {
  if (!pool.length) return [];
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const weeksPerLap = Math.max(1, Math.floor(sorted.length / perWeek));
  const lap = Math.floor(week / weeksPerLap);
  const slot = week % weeksPerLap;
  return shuffle(sorted, lap + 1).slice(slot * perWeek, slot * perWeek + perWeek);
}
