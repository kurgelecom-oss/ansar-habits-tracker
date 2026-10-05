/* ════════════════════════════════════════════════════════════════════════════
   ZONE OS — the shape every Target Map zone's OS is written in.

   Each zone (school, languages, Qur'an, digital, outdoors, boxing, chess) is
   built the way the Football Pathway is: a Today board, a library of skills
   with Bronze / Silver / Gold targets, training programmes, test-day
   benchmarks, heroes, the season, what to watch, and Mum's corner.

   STANDALONE (tk, 5 Oct 2026). Nothing here reads or feeds Ansar's programme:
   no habits, no school blocks, no PS5. Ticks, bests and focus live in
   `zone_log`, scoped per zone.
   ══════════════════════════════════════════════════════════════════════════ */

export type OsZoneId = "scholar" | "languages" | "quran" | "digital" | "outdoors" | "combat" | "chess";

export interface OsSession {
  id: string;            // unique within the zone, e.g. "mon-vocab"
  icon: string;
  title: string;
  start: string;         // "HH:MM", 24-hour, Melbourne
  minutes: number;
  what: string[];        // 2–4 short instructions
  libraryId?: string;    // links to a LibraryItem for the full card
}

export interface OsDay {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  theme: string;         // 2–4 words, e.g. "Tactics Tuesday"
  headline: string;      // one sentence for the hero
  sessions: OsSession[]; // 1–3; an empty array is a real rest day
  tip: string;           // one line shown when the day is opened
}

export interface LibraryItem {
  id: string;
  name: string;
  category: string;      // one of OsLibrary.categories
  minutes: number;
  kit: string;           // what you need
  why: string;           // 1–2 sentences
  steps: string[];       // 3–6
  points: string[];      // "coach says", 2–4
  targets: { bronze: string; silver: string; gold: string };
  watch: string;         // YouTube search phrase for a real demo
}

export interface OsLibrary {
  label: string;         // nav label, e.g. "Skills", "Openings"
  icon: string;
  title: string;
  lead: string;
  categories: string[];
  items: LibraryItem[];  // 12–16
}

export interface ProgrammeBlock { name: string; when: string; items: { name: string; dose: string; cue: string }[] }
export interface OsProgramme {
  id: string;            // url slug
  icon: string;
  label: string;         // nav label
  kicker: string;
  title: string;
  intro: string;
  rules: string[];
  blocks: ProgrammeBlock[];
  redFlags: string[];    // "Stop and tell Mum if…"
}

export interface Benchmark { id: string; icon: string; test: string; how: string; unit: string; better: "higher" | "lower"; bronze: number; silver: number; gold: number }

export interface Hero {
  id: string; name: string; emoji: string; country: string; known: string; born: string; colour: string;
  tagline: string; childhood: string; hardship: string[]; overcame: string[]; lesson: string; challenge: string;
}

export interface ZoneOS {
  id: OsZoneId;
  name: string;          // "Chess Thinking"
  shortName: string;     // nav + kicker, e.g. "Chess"
  icon: string;
  accent: string;        // hex, readable on a dark navy background
  accentSoft: string;    // same colour as rgba(…, 0.14)
  kicker: string;        // "ANSAR OS · THE CHESS ACADEMY"
  intro: string;         // one paragraph: what this OS is and why it matters

  week: OsDay[];         // all 7 days, Monday first

  library: OsLibrary;
  programmes: OsProgramme[];       // 2–3

  experts: {
    title: string;       // "What a chess coach is really looking for"
    lead: string;
    corners: { icon: string; name: string; lookFor: string[] }[];  // 4–5
    redCards: string[];  // habits that hold you back
  };
  benchmarks: Benchmark[];          // 6–10, tested on the last Saturday of the month
  ladder: { icon: string; name: string; what: string; when: string }[];  // 4–6 rungs, the long road
  ladderNote: string;

  season: {
    goals: { icon: string; goal: string; measure: string }[];      // 3
    phases: { icon: string; name: string; months: string; aim: string }[];  // 3–5, covering the year
    phaseForMonth: string[];       // 12 entries, Jan→Dec, each a phases[].name
    months: { month: string; focus: string; libraryId?: string }[]; // 12, "January"…"December"
  };

  heroes: { title: string; lead: string; people: Hero[] };          // 5–6 people

  watch: {
    lead: string;
    worthIt: { icon: string; title: string; why: string; how?: string }[];  // 5–7
    zeroValue: { icon: string; title: string; why: string }[];               // 3–5
    rules: string[];
  };

  family: {
    role: { icon: string; text: string }[];   // Mum's role, 4–6 pills
    always: string[]; never: string[]; askFirst: string[];
  };
}
