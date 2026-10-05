import { describe, expect, it } from "vitest";
import { ZONE_OS } from ".";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

describe.each(Object.values(ZONE_OS))("$id OS", os => {
  const libIds = new Set(os.library.items.map(i => i.id));

  it("has the week Monday to Sunday, with unique session ids and valid times", () => {
    expect(os.week.map(d => d.day)).toEqual(DAYS);
    const ids = os.week.flatMap(d => d.sessions.map(s => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of os.week) for (const s of d.sessions) {
      expect(s.start).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      // Never inside homeschool on a weekday.
      if (DAYS.indexOf(d.day) < 5) expect(toMin(s.start) + s.minutes <= 8 * 60 + 30 || toMin(s.start) >= 13 * 60 + 30, `${s.id} overlaps homeschool`).toBe(true);
      if (s.libraryId) expect(libIds.has(s.libraryId), s.libraryId).toBe(true);
    }
  });

  it("has a unique, fully-linked library", () => {
    expect(libIds.size).toBe(os.library.items.length);
    expect(os.library.items.length).toBeGreaterThanOrEqual(12);
    for (const i of os.library.items) expect(os.library.categories).toContain(i.category);
  });

  it("has a whole season", () => {
    expect(os.season.months.map(m => m.month)).toEqual(MONTHS);
    expect(os.season.phaseForMonth).toHaveLength(12);
    const phases = os.season.phases.map(p => p.name);
    for (const p of os.season.phaseForMonth) expect(phases).toContain(p);
    for (const m of os.season.months) if (m.libraryId) expect(libIds.has(m.libraryId), m.libraryId).toBe(true);
  });

  it("orders every benchmark's medals the right way round", () => {
    for (const b of os.benchmarks) {
      const ordered = b.better === "higher" ? b.bronze < b.silver && b.silver < b.gold : b.bronze > b.silver && b.silver > b.gold;
      expect(ordered, b.id).toBe(true);
      expect(b.id).toMatch(/^[a-z0-9_-]{1,60}$/);
    }
    expect(new Set(os.benchmarks.map(b => b.id)).size).toBe(os.benchmarks.length);
  });

  it("has programmes with unique slugs, heroes and Mum's corner", () => {
    expect(new Set(os.programmes.map(p => p.id)).size).toBe(os.programmes.length);
    expect(os.programmes.length).toBeGreaterThanOrEqual(2);
    expect(os.heroes.people.length).toBeGreaterThanOrEqual(5);
    expect(os.family.always.length && os.family.never.length && os.family.askFirst.length).toBeTruthy();
  });

  it("never mentions the iPad, points, PS5 or French and German", () => {
    const text = JSON.stringify(os);
    expect(text).not.toMatch(/\biPad\b|\bPS5\b|\bpoints system\b|\bFrench\b|\bGerman\b/);
  });
});
