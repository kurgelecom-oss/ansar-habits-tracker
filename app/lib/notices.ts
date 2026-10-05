import { addDays, dayNameOf, weekStartOf } from "./time";

export type Notice = { who: "Ansar" | "Mum" | "Dad"; text: string };

// Term 4 2026. These dated tables are the place to edit next term.
// Ranges are inclusive Sydney dates; "" as a start means "from the beginning".
const DATED: { ranges: [string, string][]; notices: Notice[] }[] = [
  { ranges: [["", "2026-10-09"]], notices: [
    { who: "Dad", text: "Unlock the iPad once at Tests with the parent PIN before Friday." },
  ] },
  { ranges: [["2026-10-12", "2026-10-16"]], notices: [
    { who: "Ansar", text: "Maths level check is open in Tests. It shows where you are; there is nothing to pass." },
    { who: "Mum", text: "Maths level check this week. The result is in Tests under Level." },
  ] },
  // Mastery weeks, Monday to Friday.
  { ranges: [["2026-10-26", "2026-10-30"], ["2026-11-16", "2026-11-20"], ["2026-12-07", "2026-12-11"]], notices: [
    { who: "Ansar", text: "Mastery week. On Friday you teach the whole unit to Mum or Dad in five minutes." },
    { who: "Dad", text: "Teach-back on Friday. Ask him three hard questions." },
  ] },
  { ranges: [["2026-11-02", "2026-11-03"]], notices: [
    { who: "Mum", text: "Tuesday is Cup Day. Decide whether it is a school day." },
  ] },
  { ranges: [["2026-12-14", "2026-12-18"]], notices: [
    { who: "Mum", text: "Last week of term. Term ends Friday 18 December." },
  ] },
];

// Monday of the week → what the week's experiment and art need.
const SUPPLIES: Record<string, string> = {
  "2026-10-12": "salt, a shallow dish, card and paint",
  "2026-10-19": "an egg, salt, a tall glass, card and foil",
  "2026-10-26": "bicarb soda, vinegar, coloured paper, glue",
  "2026-11-02": "a sewing needle, a fridge magnet, a cork, grid paper, a black marker",
  "2026-11-09": "a shoebox, baking paper, a compass and ruler",
  "2026-11-16": "two cups, paper towel, brown paper, white paint",
  "2026-11-23": "four dried beans, jars, paper towel, card",
  "2026-11-30": "dried yeast, sugar, a balloon, a small bottle, gold paint",
  "2026-12-07": "dry spaghetti, marshmallows, a compass and ruler",
  "2026-12-14": "a torch and a ball",
};

// Months whose approval and exam days are not the last seven (term ends early).
const MONTH_WINDOWS: Record<string, { approve: [number, number]; exams: [number, number] }> = {
  "2026-12": { approve: [5, 11], exams: [12, 18] },
};

const DAY: Record<string, (week: string) => Notice[]> = {
  Monday: week => [
    { who: "Ansar", text: "Soccer training tonight." },
    ...(SUPPLIES[week] ? [{ who: "Mum" as const, text: `Supplies this week: ${SUPPLIES[week]}.` }] : []),
  ],
  Tuesday: () => [{ who: "Mum", text: "Art today. Photograph the finished piece for the log." }],
  Wednesday: () => [
    { who: "Mum", text: "Experiment today. Watch it and photograph it." },
    { who: "Ansar", text: "Soccer training tonight." },
  ],
  Thursday: () => [{ who: "Ansar", text: "Turkish today is spoken out loud to Mum." }],
  Friday: week => {
    const next = SUPPLIES[addDays(week, 7)];
    return [
      { who: "Ansar", text: "Friday review is on the board today. Hand it in to unlock the rest." },
      { who: "Dad", text: "Friday review: ten minutes with Ansar on what he handed in." },
      ...(next ? [{ who: "Mum" as const, text: `Supplies for next week: ${next}.` }] : []),
    ];
  },
  Saturday: () => [
    { who: "Mum", text: "Saturday Push: verify the three tiles with the PIN." },
    { who: "Ansar", text: "PS5 comes after the Push, if school was finished on 4 days." },
  ],
  Sunday: () => [{ who: "Mum", text: "Match day. Photograph it for the log." }],
};

const EVERY_SCHOOL_DAY: Notice[] = [
  { who: "Mum", text: "3:30 check. He shows the work, not the ticks." },
  { who: "Mum", text: "Photograph the page he is up to in his novel and add it in Log Work." },
  { who: "Ansar", text: "Explain one thing out loud in every block." },
];

/**
 * What the family needs to do on a Sydney date, in the order the board shows
 * it: dated one-offs, monthly, day-specific, everyday. Pure: no I/O, no clock.
 */
export function noticesFor(dateKey: string): Notice[] {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dayName = dayNameOf(dateKey);
  const schoolDay = dayName !== "Saturday" && dayName !== "Sunday";
  const within = ([from, to]: [number | string, number | string], value: number | string) => from <= value && value <= to;

  const dated = DATED.filter(row => row.ranges.some(range => within(range, dateKey))).flatMap(row => row.notices);

  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lastSeven: [number, number] = [lastDay - 6, lastDay];
  const windows = MONTH_WINDOWS[dateKey.slice(0, 7)] ?? { approve: lastSeven, exams: lastSeven };
  const monthName = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", month: "long" }).format(new Date(Date.UTC(y, m - 1, d)));
  const monthly: Notice[] = [];
  if (within(windows.approve, d)) monthly.push({ who: "Mum", text: `Approve ${monthName} exams in Tests. He cannot sit them until you do.` });
  if (schoolDay && d <= 7) monthly.push({ who: "Mum", text: "Screenshot his Khan Academy mastery page for the record." });
  if (schoolDay && within(windows.exams, d)) monthly.push({ who: "Ansar", text: "Monthly exams are open. One a day. Under 80% means a correction with Mum." });

  return [...dated, ...monthly, ...DAY[dayName](weekStartOf(dateKey)), ...(schoolDay ? EVERY_SCHOOL_DAY : [])];
}
