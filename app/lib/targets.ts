/* ════════════════════════════════════════════════════════════════════════════
   TARGET MAP — each zone's state for one week. Pure: no I/O, no clock.

   READ-ONLY. Nothing here ticks, gates or unlocks; the board's gates stay in
   weekend.ts and assessments/gate.ts. A zone only reads "done" from evidence
   the board already records (habit ticks, school blocks). Zones with no such
   record are "untracked" and say so, rather than inventing a logging chore.
   ══════════════════════════════════════════════════════════════════════════ */

import { WEEKEND_UNLOCK_MIN_SCHOOL_DAYS } from "./weekend";
import { SOCCER_DAYS } from "./scoring";

export type ZoneId = "football" | "scholar" | "languages" | "quran" | "digital" | "outdoors" | "combat" | "chess";
export type ZoneStatus = "done" | "waiting" | "not-started" | "untracked";
export type ZoneState = { status: ZoneStatus; done: number; target: number; note: string };

/** One school block in the week, from the programme snapshot. */
export type WeekBlock = { label: string; task: string; done: boolean };
export type WeekFacts = {
  /** Distinct dates in the week each habit was ticked, keyed by habit id. */
  habitDays: Record<string, number>;
  blocks: WeekBlock[];
};

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

const UNTRACKED: ZoneState = { status: "untracked", done: 0, target: 0, note: "No proof recorded on the board yet" };

export function zoneStates(facts: WeekFacts): Record<ZoneId, ZoneState> {
  const days = (id: string) => facts.habitDays[id] ?? 0;
  return {
    football: count(days("soccer_training"), SOCCER_DAYS.length, "training sessions"),
    scholar: count(days("homeschool_session"), WEEKEND_UNLOCK_MIN_SCHOOL_DAYS, "school days"),
    languages: blocks(facts, LANGUAGE, "language blocks"),
    quran: count(days("quran"), QURAN_DAYS_TARGET, "recitation days"),
    digital: blocks(facts, DIGITAL, "tech blocks"),
    outdoors: UNTRACKED,
    combat: UNTRACKED,
    chess: UNTRACKED,
  };
}
