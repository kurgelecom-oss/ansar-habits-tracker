import { describe, expect, it } from "vitest";
import { fixtureOn, summarise, type Fixture } from "../pathway/data/matches";
import { playersForWeek, weekIndex, type PlayerStory } from "../pathway/data/players";
import { matchLogs, parseWrite } from "./pathway";

const base: Omit<Fixture, "id" | "date" | "homeScore" | "awayScore" | "isHome"> = {
  round: "Round 1", competition: "Junior", league: "U13", home: "Our Club U13", away: "Their Club U13", homeLogo: null, awayLogo: null,
  bye: false, ground: "Park", field: null, address: null, lat: null, lng: null, status: null,
};
const fx = (id: string, date: string, isHome: boolean, h: number | null, a: number | null): Fixture => ({ ...base, id, date, isHome, homeScore: h, awayScore: a });

describe("summarise", () => {
  const now = new Date("2026-05-10T00:00:00Z");
  const fixtures = [
    fx("a", "2026-04-26T00:00:00Z", true, 3, 1),   // W 3-1
    fx("b", "2026-05-03T00:00:00Z", false, 2, 2),  // D 2-2
    fx("c", "2026-05-09T00:00:00Z", false, 4, 0),  // L 0-4 (away)
    fx("d", "2026-05-17T00:00:00Z", true, null, null),
    { ...fx("e", "2026-05-24T00:00:00Z", true, null, null), bye: true },
  ];
  const s = summarise(fixtures, now);
  it("counts the record from our side", () => {
    expect(s.record).toEqual({ p: 3, w: 1, d: 1, l: 1, gf: 5, ga: 7 });
    expect(s.form).toEqual(["L", "D", "W"]);
  });
  it("skips byes and picks the next real fixture", () => {
    expect(s.next?.id).toBe("d");
    expect(s.upcoming.map(f => f.id)).toEqual(["d"]);
  });
  it("finds a fixture by Melbourne day (a 10:30am local kick-off is the previous UTC day)", () => {
    expect(fixtureOn([fx("m", "2026-05-16T23:30:00Z", true, null, null)], "2026-05-17")?.id).toBe("m");
  });
});

describe("players of the week", () => {
  const pool = Array.from({ length: 60 }, (_, i) => ({ id: `p${String(i).padStart(2, "0")}`, name: `P${i}` }) as PlayerStory);
  it("gives six different players and nobody repeats within a lap", () => {
    const seen = new Set<string>();
    for (let w = 0; w < 10; w++) { const picks = playersForWeek(pool, w); expect(picks).toHaveLength(6); picks.forEach(p => { expect(seen.has(p.id)).toBe(false); seen.add(p.id); }); }
    expect(seen.size).toBe(60);
  });
  it("is stable for a week and changes the next week", () => {
    expect(playersForWeek(pool, 140).map(p => p.id)).toEqual(playersForWeek(pool, 140).map(p => p.id));
    expect(playersForWeek(pool, 140).map(p => p.id)).not.toEqual(playersForWeek(pool, 141).map(p => p.id));
  });
  it("rolls over on Monday in Melbourne", () => {
    const sunNight = new Date("2026-09-27T13:00:00Z"); // Sun 11pm AEST
    const monMorning = new Date("2026-09-27T15:00:00Z"); // Mon 1am AEST
    expect(weekIndex(monMorning)).toBe(weekIndex(sunNight) + 1);
  });
});

describe("match logs", () => {
  const now = new Date("2026-09-24T02:00:00Z");
  it("accepts a match from the last 14 days and refuses the future or bad numbers", () => {
    expect(parseWrite({ kind: "match", day: "2026-09-20", min: 60, goals: 1, assists: 0, rating: 7, learn: "scanned more" }, now)).toMatchObject({ kind: "match", itemId: "m-2026-09-20", rating: 7 });
    expect(parseWrite({ kind: "match", day: "2026-09-25", min: 60, goals: 0, assists: 0, rating: 7 }, now)).toHaveProperty("error");
    expect(parseWrite({ kind: "match", day: "2026-08-01", min: 60, goals: 0, assists: 0, rating: 7 }, now)).toHaveProperty("error");
    expect(parseWrite({ kind: "match", day: "2026-09-20", min: 60, goals: 0, assists: 0, rating: 0 }, now)).toHaveProperty("error");
  });
  it("reads logs back newest first and skips junk", () => {
    const logs = matchLogs([{ note: JSON.stringify({ day: "2026-09-13", min: 50, goals: 0, assists: 1, rating: 6, learn: "" }) }, { note: "not json" }, { note: JSON.stringify({ day: "2026-09-20", min: 60, goals: 1, assists: 0, rating: 8, learn: "" }) }]);
    expect(logs.map(l => l.day)).toEqual(["2026-09-20", "2026-09-13"]);
  });
});
