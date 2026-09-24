/* Ansar's season, read from fixtures.json (written nightly by
   scripts/dribl-sync.mjs from Football Victoria's Dribl Match Centre). */

import raw from "./fixtures.json";

export interface Fixture {
  id: string; date: string; round: string | null; competition: string | null; league: string | null;
  home: string; away: string; homeLogo: string | null; awayLogo: string | null; isHome: boolean; bye: boolean;
  ground: string | null; field: string | null; address: string | null; lat: number | null; lng: number | null;
  status: string | null; homeScore: number | null; awayScore: number | null;
}
export interface SeasonFile {
  configured: boolean; club: string | null; clubLogo?: string | null; team: string | null; season: string | null;
  syncedAt: string | null; teams: string[]; fixtures: Fixture[]; source?: string;
}

export const SEASON = raw as unknown as SeasonFile;

export type Outcome = "W" | "D" | "L";
export interface Played { f: Fixture; us: number; them: number; outcome: Outcome; opponent: string }

export const opponentOf = (f: Fixture) => (f.isHome ? f.away : f.home);

export function played(f: Fixture): Played | null {
  if (f.bye || f.homeScore === null || f.awayScore === null) return null;
  const us = f.isHome ? f.homeScore : f.awayScore;
  const them = f.isHome ? f.awayScore : f.homeScore;
  return { f, us, them, outcome: us > them ? "W" : us === them ? "D" : "L", opponent: opponentOf(f) };
}

export function summarise(fixtures: Fixture[], now: Date = new Date()) {
  const results = fixtures.map(played).filter((p): p is Played => p !== null).sort((a, b) => b.f.date.localeCompare(a.f.date));
  const upcoming = fixtures.filter(f => !f.bye && !played(f) && new Date(f.date).getTime() > now.getTime() - 2 * 3600_000).sort((a, b) => a.date.localeCompare(b.date));
  const record = results.reduce((r, p) => ({ ...r, p: r.p + 1, w: r.w + (p.outcome === "W" ? 1 : 0), d: r.d + (p.outcome === "D" ? 1 : 0), l: r.l + (p.outcome === "L" ? 1 : 0), gf: r.gf + p.us, ga: r.ga + p.them }), { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
  return { next: upcoming[0] ?? null, upcoming, results, record, form: results.slice(0, 5).map(p => p.outcome) };
}

const DAY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" });
export const melbourneDay = (iso: string | Date) => DAY_FMT.format(typeof iso === "string" ? new Date(iso) : iso);

/** A fixture on the given Melbourne calendar day (match-day banner on Today). */
export function fixtureOn(fixtures: Fixture[], day: string): Fixture | null {
  return fixtures.find(f => !f.bye && melbourneDay(f.date) === day) ?? null;
}

const KICKOFF_FMT = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const kickoff = (iso: string) => KICKOFF_FMT.format(new Date(iso));

export const mapsUrl = (f: Fixture) =>
  f.lat && f.lng ? `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}` : f.ground ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.ground} Victoria`)}` : null;
