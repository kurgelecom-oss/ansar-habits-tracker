/* ════════════════════════════════════════════════════════════════════════════
   TARGET MAP — each zone's state for one week. Pure: no I/O, no clock.

   Five zones read evidence the board already records (habit ticks, school
   blocks). Outdoors, boxing and chess have no such record, so they read a
   weekly proof Ansar logs and a parent confirms with the PIN (target_proofs).
   Nothing here ticks or unlocks; weekend.ts consumes zonesDone() for PS5.
   ══════════════════════════════════════════════════════════════════════════ */

import { WEEKEND_UNLOCK_MIN_SCHOOL_DAYS } from "./weekend";
import { SOCCER_DAYS } from "./scoring";

export type ZoneId = "football" | "scholar" | "languages" | "quran" | "digital" | "outdoors" | "combat" | "chess";
export type ZoneStatus = "done" | "waiting" | "not-started";
export type ZoneState = { status: ZoneStatus; done: number; target: number; note: string };

/** One school block in the week, from the programme snapshot. */
export type WeekBlock = { label: string; task: string; done: boolean };
export type WeekFacts = {
  /** Distinct dates in the week each habit was ticked, keyed by habit id. */
  habitDays: Record<string, number>;
  blocks: WeekBlock[];
  /** This week's logged proofs, keyed by zone. */
  proofs?: Partial<Record<ZoneId, { confirmed: boolean }>>;
};

export const ZONE_IDS: readonly ZoneId[] = ["football", "scholar", "languages", "quran", "digital", "outdoors", "combat", "chess"];
/** Zones read from a logged + parent-confirmed proof rather than board ticks. */
export const PROOF_ZONES: readonly ZoneId[] = ["outdoors", "combat", "chess"];

/** Saturday PS5 needs this many of the eight zones done (tk, 5 Oct 2026). */
export const TARGET_ZONES_FOR_PS5 = 5;
/** First week the zone rule counts toward PS5. Weeks before it are exempt. */
export const TARGET_GATE_START = "2026-10-12";

export function isZoneId(v: unknown): v is ZoneId {
  return typeof v === "string" && (ZONE_IDS as readonly string[]).includes(v);
}

/** Daily recitation on five of the six board days counts as a steady week. */
export const QURAN_DAYS_TARGET = 5;

const LANGUAGE = /turkish|arabic|language/i;
// "Technologies" and "Skills mix" rows carry Scratch, typing and Mac work.
const DIGITAL = /technolog|scratch|typing|coding|keyboard/i;

function count(done: number, target: number, unit: string): ZoneState {
  const status: ZoneStatus = done >= target ? "done" : done > 0 ? "waiting" : "not-started";
  return { status, done, target, note: `${Math.min(done, target)}/${target} ${unit}` };
}

function blocks(facts: WeekFacts, match: RegExp, unit: string): ZoneState {
  const planned = facts.blocks.filter(b => match.test(`${b.label} ${b.task}`));
  if (planned.length === 0) return { status: "not-started", done: 0, target: 0, note: "Nothing planned this week" };
  return count(planned.filter(b => b.done).length, planned.length, unit);
}

function proof(facts: WeekFacts, zone: ZoneId): ZoneState {
  const p = facts.proofs?.[zone];
  if (!p) return { status: "not-started", done: 0, target: 1, note: "No proof logged this week" };
  return p.confirmed
    ? { status: "done", done: 1, target: 1, note: "Proof confirmed by a parent" }
    : { status: "waiting", done: 0, target: 1, note: "Proof logged, waiting for a parent" };
}

export function zoneStates(facts: WeekFacts): Record<ZoneId, ZoneState> {
  const days = (id: string) => facts.habitDays[id] ?? 0;
  return {
    football: count(days("soccer_training"), SOCCER_DAYS.length, "training sessions"),
    scholar: count(days("homeschool_session"), WEEKEND_UNLOCK_MIN_SCHOOL_DAYS, "school days"),
    languages: blocks(facts, LANGUAGE, "language blocks"),
    quran: count(days("quran"), QURAN_DAYS_TARGET, "recitation days"),
    digital: blocks(facts, DIGITAL, "tech blocks"),
    outdoors: proof(facts, "outdoors"),
    combat: proof(facts, "combat"),
    chess: proof(facts, "chess"),
  };
}

export function zonesDone(states: Record<ZoneId, ZoneState>): number {
  return ZONE_IDS.filter(id => states[id].status === "done").length;
}
