/* ════════════════════════════════════════════════════════════════════════════
   Ansar's school year (tk + Nihal, 11 Oct 2026).

   The yardstick is the Australian Curriculum v9, Year 6, across the 8 learning
   areas Victorian home-ed registration expects. It sets the LEVEL of each
   skill, not the topics: the topics are the family's own ("nothing Australian").

   Targets are WEEKLY: every subject has one thing to show each week. The end
   of term is simply every weekly proof done plus 80%+ on each monthly exam.
   The day-by-day lessons live in Notion (2 · Daily Programme); this file holds
   only what sits above the week. Never use the word "Christmas" here.
   ══════════════════════════════════════════════════════════════════════════ */

export type Area = "Maths" | "English" | "HASS" | "Science" | "The Arts" | "Technologies" | "Turkish" | "Health & PE";

export const YEAR_LEVEL = 6;

export const TERM = {
  name: "Term 4 · Three Worlds",
  start: "2026-10-05",   // Monday, Week 1
  end: "2026-12-18",     // Friday, last day of term
  weeks: 11,
  endLabel: "End of term · Fri 18 Dec",
} as const;

/** What Year 6 expects by the end of the year, in plain words (AC v9). */
export const YEAR6_GOALS: Record<Area, string> = {
  Maths: "Fractions, decimals and percentages, all four operations; find unknowns in equations; area, volume and units; angles, the coordinate plane and transformations; chance as fractions, decimals and percentages.",
  English: "Read and compare novels; write planned essays with a clear point, evidence and a conclusion; grammar and punctuation used correctly in his own writing.",
  HASS: "Use sources and evidence, put events in order on a timeline, explain causes and effects, and read and draw maps.",
  Science: "Plan a fair test, predict before it starts, record what really happened, and explain the difference.",
  "The Arts": "Plan and make finished pieces using line, colour, shape and pattern, and explain the choices made.",
  Technologies: "Design and build programs with variables, decisions, loops and lists; test them and fix what goes wrong.",
  Turkish: "Hold a short everyday conversation: family, numbers, food, colours, days, places and simple questions.",
  "Health & PE": "Regular training and match play, warm-ups, teamwork and looking after his body.",
};

/** The one thing each subject shows every week. */
export const WEEKLY_PROOF: Record<Area, string> = {
  Maths: "Thursday problem set done, mistakes corrected",
  English: "Chapters logged and the written answers done",
  HASS: "Timeline, map and the Thursday piece",
  Science: "One experiment: guess first, then the real result",
  "The Arts": "One finished piece (photo)",
  Technologies: "A working Scratch project",
  Turkish: "Tue + Thu: the words with meanings and five sentences",
  "Health & PE": "Football training and matches logged",
};

/** End-of-term targets, due TERM.end. */
export const TERM_TARGETS: Record<Area, string> = {
  Maths: "80%+ on the October, November and December exams. Stretch goal: ratio and rates (Year 7 work).",
  English: "Finish Boy Overboard and The Boy at the Back of the Class, start Refugee, and write one five-paragraph essay.",
  HASS: "Three teach-backs: the Ottomans (30 Oct), the Islamic world (20 Nov), Europe (11 Dec).",
  Science: "An experiment record every week from Week 2: 10 in all.",
  "The Arts": "A piece every week, gathered into a portfolio in Week 11.",
  Technologies: "The quiz game finished, shared and shown to the family.",
  Turkish: "A one-minute talk in Turkish, recorded and marked by Nihal.",
  "Health & PE": "Football counts as PE: about 12 hours a week on the Football pathway.",
};

/** Weekly proofs are read from block ticks from Week 2 (12 Oct). Week 1 ran before
 *  the Year tab existed and no blocks were ticked one by one, so it is not judged. */
export const TRACKING_FROM_WEEK = 2;

/** Subjects with a weekly proof the board can see from block ticks. Health & PE is shown from the Football pathway. */
export const TRACKED: Area[] = ["Maths", "English", "HASS", "Science", "The Arts", "Technologies", "Turkish"];

export type TermWeek = { n: number; start: string; unit: string; history: string; maths: string; milestones: string[] };

export const WEEKS: TermWeek[] = [
  { n: 1, start: "2026-10-05", unit: "Istanbul", history: "Istanbul, the city on two continents (the last Ottoman week)", maths: "Fractions, decimals and percentages", milestones: [] },
  { n: 2, start: "2026-10-12", unit: "Ottomans 1", history: "Osman, into Europe and the Janissaries, 1453, Selim and the holy cities", maths: "Percentages of amounts", milestones: ["Mon 12 Oct: maths level check opens (due Fri 16)"] },
  { n: 3, start: "2026-10-19", unit: "Ottomans 2", history: "Süleyman the Lawgiver, three continents, many peoples, maps, stars and printing", maths: "Adding and subtracting fractions", milestones: [] },
  { n: 4, start: "2026-10-26", unit: "Ottomans 3 · mastery", history: "Ottoman mastery week: Vienna 1683, railways and reforms, the end in 1922", maths: "Decimals", milestones: ["Fri 30 Oct: Ottoman teach-back", "Last week of Oct: October exams"] },
  { n: 5, start: "2026-11-02", unit: "Islamic world 1", history: "The caliphs, paper, the astrolabe, Ibn al-Haytham", maths: "Negative numbers, order of operations, primes", milestones: ["Tue 3 Nov: Melbourne Cup Day, parents' call"] },
  { n: 6, start: "2026-11-09", unit: "Islamic world 2", history: "House of Wisdom, al-Khwarizmi, Ibn Sina, al-Idrisi", maths: "Algebra (he has already done variables: extend it)", milestones: [] },
  { n: 7, start: "2026-11-16", unit: "Islamic world 3 · mastery", history: "Sahara trade, Mansa Musa, Timbuktu, the Swahili coast", maths: "Area, volume and units", milestones: ["Fri 20 Nov: Islamic world teach-back"] },
  { n: 8, start: "2026-11-23", unit: "Europe 1", history: "Charlemagne, Vikings, cathedrals, Magna Carta", maths: "Angles, coordinates, transformations", milestones: ["Last week of Nov: November exams"] },
  { n: 9, start: "2026-11-30", unit: "Europe 2", history: "Castles, the Black Death, Gutenberg, Leonardo", maths: "Statistics and probability", milestones: [] },
  { n: 10, start: "2026-12-07", unit: "Europe 3 · mastery", history: "1453, the great voyages, the Columbian Exchange", maths: "Ratio, rates, time and speed (stretch)", milestones: ["Fri 11 Dec: Europe teach-back"] },
  { n: 11, start: "2026-12-14", unit: "The whole world", history: "World Cup geography and the year on one timeline", maths: "Revision", milestones: ["December exams, due Fri 18 Dec", "Fri 18 Dec: end of term"] },
];

/** The board's label for a block → the learning area its proof counts towards. */
export function areaOfLabel(label: string): Area | null {
  if (/review|tidy|catch.?up|go deeper|flex|teach-back|skills mix/i.test(label)) return null;
  if (/turkish|language/i.test(label)) return "Turkish";
  if (/technolog|scratch|coding/i.test(label)) return "Technologies";
  if (/math/i.test(label)) return "Maths";
  if (/english|grammar/i.test(label)) return "English";
  if (/hass|history|geography/i.test(label)) return "HASS";
  if (/science/i.test(label)) return "Science";
  if (/\barts?\b/i.test(label)) return "The Arts";
  if (/health|\bpe\b|football|soccer/i.test(label)) return "Health & PE";
  return null;
}

/** Which term week a date falls in, 1–11, or null outside the term. */
export function weekNumberOf(date: string): number | null {
  if (date < TERM.start || date > TERM.end) return null;
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${TERM.start}T00:00:00Z`)) / 86_400_000);
  return Math.min(TERM.weeks, Math.floor(days / 7) + 1);
}

export type ProofState = "done" | "partial" | "due" | "missed" | "upcoming" | "none";

/** A week's proof for one subject: done only when every one of its blocks that week is ticked. */
export function proofState(planned: number, done: number, week: number, currentWeek: number): ProofState {
  if (!planned || week < TRACKING_FROM_WEEK) return "none";
  if (done >= planned) return "done";
  if (week > currentWeek) return "upcoming";
  if (week < currentWeek) return done ? "partial" : "missed";
  return done ? "partial" : "due";
}
