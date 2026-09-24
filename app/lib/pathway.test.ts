import { describe, expect, it } from "vitest";
import { bestScores, isMissingTable, parseWrite } from "./pathway";
import { WEEK, WEEKLY_CAP_HOURS, checklistFor, planFor, weeklyLoadMinutes } from "../pathway/data/week";
import { BENCHMARKS, MONTH_FOCUS, tierFor } from "../pathway/data/scouts";
import { DRILLS, drillById } from "../pathway/data/drills";
import { buildIcs } from "../pathway/components/TodayBoard";

const NOON_SYD = new Date("2026-09-24T02:00:00Z"); // Thu 24 Sep 2026, 12:00 Sydney

describe("parseWrite", () => {
  it("accepts a tick for today and yesterday, refuses older", () => {
    expect(parseWrite({ kind: "tick", itemId: "dawn_touches", done: true, date: "2026-09-24" }, NOON_SYD)).toMatchObject({ kind: "tick", date: "2026-09-24" });
    expect(parseWrite({ kind: "tick", itemId: "dawn_touches", done: true, date: "2026-09-23" }, NOON_SYD)).toMatchObject({ kind: "tick" });
    expect(parseWrite({ kind: "tick", itemId: "dawn_touches", done: true, date: "2026-09-20" }, NOON_SYD)).toHaveProperty("error");
  });
  it("rejects bad ids and unknown benchmarks", () => {
    expect(parseWrite({ kind: "tick", itemId: "DROP TABLE", done: true }, NOON_SYD)).toHaveProperty("error");
    expect(parseWrite({ kind: "pb", itemId: "nope", value: 3 }, NOON_SYD)).toHaveProperty("error");
    expect(parseWrite({ kind: "pb", itemId: "juggle_alt", value: 120 }, NOON_SYD)).toMatchObject({ kind: "pb", value: 120 });
  });
  it("trims focus notes and requires text", () => {
    expect(parseWrite({ kind: "focus", note: "   " }, NOON_SYD)).toHaveProperty("error");
    expect(parseWrite({ kind: "focus", note: "x".repeat(300) }, NOON_SYD)).toMatchObject({ note: "x".repeat(140) });
  });
});

describe("bestScores", () => {
  it("keeps the highest for higher-is-better and the lowest for lower-is-better", () => {
    const best = bestScores([
      { item_id: "juggle_alt", value: 80, log_date: "2026-09-01" },
      { item_id: "juggle_alt", value: 120, log_date: "2026-09-10" },
      { item_id: "sprint_20", value: 3.9, log_date: "2026-09-01" },
      { item_id: "sprint_20", value: 4.1, log_date: "2026-09-10" },
    ]);
    expect(best.juggle_alt.value).toBe(120);
    expect(best.sprint_20.value).toBe(3.9);
  });
});

describe("tierFor", () => {
  const sprint = BENCHMARKS.find(b => b.id === "sprint_20")!;
  it("reads lower-is-better correctly", () => {
    expect(tierFor(sprint, 3.4)).toBe("gold");
    expect(tierFor(sprint, 3.9)).toBe("bronze");
    expect(tierFor(sprint, 4.5)).toBe("starting");
    expect(tierFor(sprint, null)).toBeNull();
  });
});

describe("the week", () => {
  it("stays under the 12-hour cap", () => {
    expect(weeklyLoadMinutes() / 60).toBeLessThanOrEqual(WEEKLY_CAP_HOURS);
  });
  it("never schedules football inside homeschool hours on weekdays", () => {
    for (const day of WEEK.slice(0, 5)) for (const s of day.sessions) {
      const [h, m] = s.start.split(":").map(Number);
      const start = h * 60 + m;
      const end = start + s.minutes;
      expect(end <= 8 * 60 + 30 || start >= 13 * 60 + 30, `${day.day} ${s.id}`).toBe(true);
    }
  });
  it("keeps Sunday a rest day and has unique session ids per day", () => {
    expect(planFor("Sunday").sessions.every(s => !s.countsToLoad)).toBe(true);
    for (const day of WEEK) expect(new Set(checklistFor(day).map(c => c.id)).size).toBe(checklistFor(day).length);
  });
});

describe("content wiring", () => {
  it("every month focus points at a real drill, drill ids are unique", () => {
    for (const m of MONTH_FOCUS) expect(drillById(m.drill), m.month).toBeDefined();
    expect(new Set(DRILLS.map(d => d.id)).size).toBe(DRILLS.length);
  });
  it("every week-plan drill link resolves", () => {
    for (const day of WEEK) for (const s of day.sessions) {
      const hash = s.href?.split("#")[1];
      if (hash) expect(drillById(hash), s.id).toBeDefined();
    }
  });
  it("builds a calendar with one weekly event per non-rest session", () => {
    const ics = buildIcs();
    const sessions = WEEK.flatMap(d => d.sessions).filter(s => s.kind !== "rest").length;
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(sessions);
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO");
  });
});

describe("isMissingTable", () => {
  it("recognises both Postgres and PostgREST missing-table errors", () => {
    expect(isMissingTable({ code: "42P01" })).toBe(true);
    expect(isMissingTable({ code: "PGRST205" })).toBe(true);
    expect(isMissingTable({ code: "23505" })).toBe(false);
  });
});
