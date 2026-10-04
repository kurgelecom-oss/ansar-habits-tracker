import { describe, expect, it } from "vitest";
import { footballPillar, schoolPillar, type SchoolWeek } from "./pillars";
import { planFor } from "../pathway/data/week";

const block = (n: number, done = false) =>
  ({ rowId: `r${n}`, label: `Block ${n}`, duration: "45 min", task: `Task ${n}`, done });

const week = (isToday: boolean): SchoolWeek => ({
  today: isToday ? "2026-10-05" : "2026-10-04",
  weekTitle: "Term 4 — Week 1",
  days: [
    { date: "2026-10-05", weekday: "Monday", dayTopic: "Istanbul", isToday, blocks: [block(1, true), block(2), block(3), block(4)] },
    { date: "2026-10-06", weekday: "Tuesday", dayTopic: "", isToday: false, blocks: [block(5)] },
  ],
});

describe("schoolPillar", () => {
  it("counts today's blocks and shows the next two still to do", () => {
    const s = schoolPillar(week(true));
    expect([s.done, s.total]).toEqual([1, 4]);
    expect(s.rows.map(r => r.title)).toEqual(["Block 2", "Block 3"]);
    expect(s.rows[0].detail).toBe("Task 2");
    expect(s.note).toBeNull();
  });

  it("points at the next school day when today has none", () => {
    const s = schoolPillar(week(false));
    expect(s.total).toBe(0);
    expect(s.rows).toEqual([]);
    expect(s.note).toBe("No school today. Next: Monday — Istanbul · 4 blocks");
  });

  it("says so when every block is done", () => {
    const w = week(true);
    w.days[0].blocks = [block(1, true)];
    expect(schoolPillar(w)).toMatchObject({ done: 1, total: 1, rows: [], note: "Every block done today." });
  });
});

describe("footballPillar", () => {
  const monday = planFor("Monday");
  const sessions = monday.sessions.filter(s => s.kind !== "rest");

  it("counts sessions and skips the ones already ticked", () => {
    const s = footballPillar(monday, [sessions[0].id]);
    expect([s.done, s.total]).toEqual([1, sessions.length]);
    expect(s.rows[0].id).toBe(sessions[1].id);
    expect(s.subtitle).toBe(monday.theme);
  });

  it("ignores ticks that are not sessions", () => {
    expect(footballPillar(monday, ["water", "sleep"]).done).toBe(0);
  });

  it("says so when every session is done", () => {
    const s = footballPillar(monday, sessions.map(x => x.id));
    expect(s.rows).toEqual([]);
    expect(s.note).toBe("Every session done today.");
  });
});
