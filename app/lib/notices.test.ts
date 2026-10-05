import { describe, expect, it } from "vitest";
import { noticesFor } from "./notices";

const lines = (date: string) => noticesFor(date).map(n => `${n.who}: ${n.text}`);
const EVERYDAY = [
  "Mum: 3:30 check. He shows the work, not the ticks.",
  "Mum: Photograph the page he is up to in his novel and add it in Log Work.",
  "Ansar: Explain one thing out loud in every block.",
];

describe("noticesFor", () => {
  it("gives a normal Wednesday its day notices, then the everyday ones", () => {
    expect(lines("2026-10-21")).toEqual([
      "Mum: Experiment today. Watch it and photograph it.",
      "Ansar: Soccer training tonight.",
      ...EVERYDAY,
    ]);
  });

  it("puts the Friday review and next week's supplies on a Friday", () => {
    expect(lines("2026-10-16")).toEqual([
      "Ansar: Maths level check is open in Tests. It shows where you are; there is nothing to pass.",
      "Mum: Maths level check this week. The result is in Tests under Level.",
      "Ansar: Friday review is on the board today. Hand it in to unlock the rest.",
      "Dad: Friday review: ten minutes with Ansar on what he handed in.",
      "Mum: Supplies for next week: an egg, salt, a tall glass, card and foil.",
      ...EVERYDAY,
    ]);
  });

  it("names this week's supplies on a Monday only when the week has an entry", () => {
    expect(lines("2026-10-19")).toContain("Mum: Supplies this week: an egg, salt, a tall glass, card and foil.");
    expect(lines("2026-10-05").some(l => l.includes("Supplies"))).toBe(false);
  });

  it("shows only the Push on a Saturday, with no school-day notices", () => {
    expect(lines("2026-10-10")).toEqual([
      "Mum: Saturday Push: verify the three tiles with the PIN.",
      "Ansar: PS5 comes after the Push, if school was finished on 4 days.",
    ]);
  });

  it("opens approval and the exam window in the last seven days of a month", () => {
    expect(lines("2026-11-25")).toEqual([
      "Mum: Approve November exams in Tests. He cannot sit them until you do.",
      "Ansar: Monthly exams are open. One a day. Under 80% means a correction with Mum.",
      "Mum: Experiment today. Watch it and photograph it.",
      "Ansar: Soccer training tonight.",
      ...EVERYDAY,
    ]);
    expect(lines("2026-11-23").some(l => l.includes("Approve"))).toBe(false);
    // Approval still shows on a weekend; the exams themselves do not.
    expect(lines("2026-11-28")[0]).toBe("Mum: Approve November exams in Tests. He cannot sit them until you do.");
    expect(lines("2026-11-28").some(l => l.includes("Monthly exams"))).toBe(false);
  });

  it("moves December 2026 forward: approve 5–11, exams 12–18", () => {
    expect(lines("2026-12-11").some(l => l.startsWith("Mum: Approve December exams"))).toBe(true);
    expect(lines("2026-12-11").some(l => l.includes("Monthly exams"))).toBe(false);
    expect(lines("2026-12-14").slice(0, 2)).toEqual([
      "Mum: Last week of term. Term ends Friday 18 December.",
      "Ansar: Monthly exams are open. One a day. Under 80% means a correction with Mum.",
    ]);
    expect(lines("2026-12-28").some(l => /Approve|Monthly exams/.test(l))).toBe(false);
  });

  it("leads a mastery week with the teach-back, Monday to Friday only", () => {
    expect(lines("2026-11-17").slice(0, 2)).toEqual([
      "Ansar: Mastery week. On Friday you teach the whole unit to Mum or Dad in five minutes.",
      "Dad: Teach-back on Friday. Ask him three hard questions.",
    ]);
    expect(lines("2026-11-21").some(l => l.includes("Mastery week"))).toBe(false);
  });

  it("drops every dated notice once the term is over", () => {
    expect(lines("2027-02-01")).toEqual([
      "Mum: Screenshot his Khan Academy mastery page for the record.",
      "Ansar: Soccer training tonight.",
      ...EVERYDAY,
    ]);
  });
});
